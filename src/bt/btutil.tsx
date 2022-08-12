import {PATH_MECH_IMGS} from './const'


//! Load an image and then apply the given color.
export async function load_mech_image(name:string, color:[number,number,number]) {
  return new Promise((resolve) => {
    var img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx:any = canvas.getContext('2d');

      // get the image data
      ctx.drawImage(img, 0, 0);
      const ximg = ctx.getImageData(0, 0, img.width, img.height);
      for (var i=0; i<ximg.data.length; i+=4) {
        if (ximg.data[i+3] === 255) {
          var n = (ximg.data[i]/255);
          ximg.data[i] = n * color[0];
          ximg.data[i+1] = n * color[1];
          ximg.data[i+2] = n * color[2];
        }
      }

      // extract the image back out
      ctx.putImageData(ximg, 0, 0);
      var nimg = new Image();
      nimg.src = canvas.toDataURL();
      resolve(nimg);
    };
    img.src = `${PATH_MECH_IMGS}/${name}.png`
  });
}


