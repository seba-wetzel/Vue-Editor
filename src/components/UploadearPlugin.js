import { api } from 'boot/axios';

class MyUploadAdapter {
  constructor(loader, url) {
    // The file loader instance to use during the upload.
    this.loader = loader;
    this.url = url;
  }

  // Starts the upload process.
  upload() {
    const upload = async (file) => {
      const data = new FormData();

      data.append('archivo', file);
      try {
        const { data: res } = await api.post(`${this.url}`, data);
        console.log();
        return {
          default: `/images/editor/${res}`,
        };
      } catch (e) {
        console.error('Error uploading file:', e);
      }
    };
    return this.loader.file.then((file) => upload(file));
  }

  // Aborts the upload process.
  abort() {
    // Reject the promise returned from the upload() method.
  }
}
export const MyCustomUploadAdapterPluginGenerator = (url) =>
  function (editor) {
    editor.plugins.get('FileRepository').createUploadAdapter = (loader) => {
      // Configure the URL to the upload script in your back-end here!
      return new MyUploadAdapter(loader, url);
    };
  };
