const ASCII_CHARS = "@#S%?*+;:,. ";
const mapScale = (ASCII_CHARS.length - 1) / 255;

let bitCanvas, bitCtx;


let brightnessLUT = new Uint8Array(256);

function buildLUT(contrast = 1) {
    for (let i = 0; i < 256; i++) {
        let v = (i - 128) * contrast + 128;
        v = Math.max(0, Math.min(255, v));
        brightnessLUT[i] = v;
    }
}


self.onmessage = async (e) => {
    const { 
      bitmap,
      width,
      height, 
      isColor,
      fontSize,
      contrast
    } = e.data;


    buildLUT(contrast);
    
    
    if (!bitCanvas) {
        bitCanvas = new OffscreenCanvas(width * fontSize, height * fontSize);
        bitCtx = bitCanvas.getContext("2d");
        bitCtx.textBaseline = "top";
        bitCtx.font = `${fontSize}px monospace`;
    }

    bitCanvas.width = width * fontSize;
    bitCanvas.height = height * fontSize;

    bitCtx.fillStyle = "#000";
    bitCtx.fillRect(0, 0, bitCanvas.width, bitCanvas.height);

    const tmpCanvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const tmpCtx = tmpCanvas.getContext("2d");
    tmpCanvas.width = bitmap.width;
    tmpCanvas.height = bitmap.height;
    tmpCtx.drawImage(bitmap, 0, 0);



    const srcW = bitmap.width;
    const srcH = bitmap.height;

    const dstW = width;
    const dstH = height;

    const srcAspect = srcW / srcH;
    const dstAspect = width / height;

    let dw, dh, offsetX, offsetY;

    if (srcAspect > dstAspect) {
        dw = dstW;
        dh = dw / srcAspect;
        offsetX = 0;
        offsetY = (dstH - dh) / 2;
    } else {
        dh = dstH;
        dw = dh * srcAspect;
        offsetY = 0;
        offsetX = (dstW - dw) / 2;
    }

    const imgData = tmpCtx.getImageData(0, 0, srcW, srcH).data;

    for (let y = 0; y < dstH; y++) {
        for (let x = 0; x < dstW; x++) {
          if (
              x < offsetX || x >= offsetX + dw ||
              y < offsetY || y >= offsetY + dh
          ) {
              continue;
          }
          const u = (x - offsetX) / dw;
          const v = (y - offsetY) / dh;


          const srcX = Math.floor(u * srcW);
          const srcY = Math.floor(v * srcH);
          
          
          const i = (srcY * srcW + srcX) * 4;

          let r = imgData[i];
          let g = imgData[i + 1];
          let b = imgData[i + 2];


          let brightness = Math.floor((r + g + b) / 3);
          brightness = 255 - brightness;
          brightness = brightnessLUT[brightness];

          let index = Math.floor(brightness * mapScale);

          const char = ASCII_CHARS[index];

          bitCtx.fillStyle = isColor ? `rgb(${r},${g},${b})` : "#fff";

          bitCtx.fillText(
            char, 
            x * fontSize,
            y * fontSize
        );
      };
    };

    const result = bitCanvas.transferToImageBitmap();
    self.postMessage(result, [result]);
};