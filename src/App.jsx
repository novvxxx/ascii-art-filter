import './App.css';
import { useEffect, useRef, useState } from "react";

export default function App() {
  const outputCanvasRef = useRef(null);
  const workerRef = useRef(null);

  const[fileName, setFileName] = useState("Choose file");
  const[image, setImage] = useState(null);
  const [isColor, setIsColor] = useState(false);
  
  const widthSlider = useSnapSlider(10, 120);
  const contrastSlider = useSnapSlider(0.1, 1);


  useEffect(() => {
    workerRef.current = new Worker(
      new URL("./worker.js", import.meta.url),
      { type: "module" }
    );

    workerRef.current.onmessage = (e) => {
      const bitmap = e.data;
      const canvas = outputCanvasRef.current;
      const ctx = canvas.getContext("2d");

      canvas.width = bitmap.width;
      canvas.height = bitmap.height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0);
    };

    return () => workerRef.current.terminate();
  }, []);

  function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);

    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = () => setImage(img);
  };
  
  function saveImage() {
    const canvas = outputCanvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      const link = document.createElement("a");
      link.download = "ascii.png";
      link.href = URL.createObjectURL(blob);
      link.click();
    })
  }
  useEffect(() => {
    if (!image || !workerRef.current) return;
  
    (async () => {
      const bitmap = await createImageBitmap(image);

      const targetWidth = widthSlider.committedValue;
      const targetHeight = Math.round(widthSlider.committedValue * 0.6);
    
      workerRef.current.postMessage({
        bitmap,
        width: targetWidth,
        height: targetHeight,
        isColor,
        fontSize: 6,
        contrast: contrastSlider.committedValue,
      }, [bitmap]);
    })();
  }, [image, widthSlider.committedValue, isColor, contrastSlider.committedValue]);

  function useSnapSlider(step, initialValue) {
    const [value, setValue] = useState(initialValue);           // текущее drag значение
    const [committedValue, setCommittedValue] = useState(initialValue); // значение для рендера
    const ref = useRef(null);

    const handleChange = (e) => setValue(+e.target.value);

    const handleMouseUp = () => {
      const snapped = Math.round(value / step) * step;

      const input = ref.current;
      if (!input) return;

      input.style.transition = "all 0.2s ease";
      setValue(snapped);
      setCommittedValue(snapped);

      setTimeout(() => {
        if (input) input.style.transition = "";
      }, 200);
    };

    return {
      value,
      committedValue,
      ref,
      handleChange,
      handleMouseUp,
    };
  } 
  
  function slider(value, min, max) {
    const percent = ((value - min) / (max - min)) * 100;

    return {
      background: `linear-gradient(
        to right,
        var(--neutral-100) 0%,
        var(--neutral-100) ${percent}%,
        var(--primary-300) ${percent}%,
        var(--primary-300) 100%
      )
      `,
      transition: "background 0.2s ease"
    };
  }

   return (
    <div className='container'>
     <div className='card-logo'> 
      <h1>ASCII image filter</h1>        
     </div>
      <canvas 
        ref={outputCanvasRef} 
        style={{ 
          imageRendering: "auto", 
        }}
        className='canvas'
      />
      <div className='toolbar'>
          <form method='post' encType='multipart/form-data'>
            <label className='input-file'>
              <input 
                type="file"
                accept="image/*" 
                onChange={handleImageUpload}
                className='uploader'
              />
              <span>{fileName}</span>
            </label>
          </form>
          <label>
            Width: {widthSlider.value}
           <div className='slider-wrap'>
            <div className="slider-border"></div>
            <input
              type="range"
              min={40}
              max={300}
              step={1}
              value={widthSlider.value}
              ref={widthSlider.ref}
              onChange={widthSlider.handleChange}
              onMouseUp={widthSlider.handleMouseUp}
              style={slider(widthSlider.value, 40, 300)}
              className='slider'
            />
           </div>
          </label>
          <label>
            Contrast: {contrastSlider.value.toFixed(2)}
           <div className='slider-wrap'>
            <div className="slider-border"></div>
            <input
              type="range"
              min={0.5}
              max={2.5}
              step={0.01}
              value={contrastSlider.value}
              ref={contrastSlider.ref}
              onChange={contrastSlider.handleChange}
              onMouseUp={contrastSlider.handleMouseUp}
              style={slider(contrastSlider.value, 0.5, 2.5)}
              className='slider'
            />
           </div>
          </label>
          <label className='color-switch'>
            <input
              type="checkbox"
              checked={isColor}
              onChange={(e) => setIsColor(e.target.checked)}
              className='check-box'
            />
            Color
          </label>
      </div>
      <button 
        onClick={saveImage}
        className='save-button'
      >
        Save Image
      </button>
    </div>
  );
}