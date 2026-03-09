export const compressImage = (file: File, maxWidth: number = 800): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        const quality = 0.7;
        const base64 = canvas.toDataURL('image/jpeg', quality);
        resolve(base64);
      };
      
      img.onerror = () => {
        reject(new Error('图像加载失败'));
      };
      
      img.src = event.target?.result as string;
    };
    
    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };
    
    reader.readAsDataURL(file);
  });
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      resolve(base64);
    };
    
    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };
    
    reader.readAsDataURL(file);
  });
};

export const validateImageSize = (base64: string, maxSizeKB: number = 500): boolean => {
  const size = new Blob([base64]).size;
  const maxSizeBytes = maxSizeKB * 1024;
  return size <= maxSizeBytes;
};

export const getImageDimensions = (base64: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
      });
    };
    
    img.onerror = () => {
      reject(new Error('无法获取图像尺寸'));
    };
    
    img.src = base64;
  });
};

export const cropImageToBase64 = (
  base64: string,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = width;
      canvas.height = height;
      
      ctx?.drawImage(img, x, y, width, height, 0, 0, width, height);
      
      const croppedBase64 = canvas.toDataURL('image/jpeg', 0.9);
      resolve(croppedBase64);
    };
    
    img.onerror = () => {
      reject(new Error('图像裁剪失败'));
    };
    
    img.src = base64;
  });
};

export const createThumbnail = (base64: string, size: number = 100): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const scale = Math.min(size / img.width, size / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
      resolve(thumbnail);
    };
    
    img.onerror = () => {
      reject(new Error('缩略图生成失败'));
    };
    
    img.src = base64;
  });
};
