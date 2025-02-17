import { Injectable } from '@angular/core';

import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Storage } from '@capacitor/storage';

import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class PhotoService {
  public photos: UserPhoto[] = [];
  // eslint-disable-next-line @typescript-eslint/no-inferrable-types
  private photoStorage: string = 'photos';
  private platform: Platform;

  constructor(platform: Platform) {
    this.platform = platform;
  }
  public async addNewToGallery() {
    // Take a photo
    const capturedPhoto = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100
    });
    // Save in Web
    // this.photos.unshift({
    //   filepath: 'soon...',
    //   webviewPath: capturedPhoto.webPath
    // });
    // Save locally
    const savedImageFile: any = await this.savePicture(capturedPhoto);
    this.photos.unshift(savedImageFile);
    Storage.set({
      key: this.photoStorage,
      value: JSON.stringify(this.photos),
    });
  }
  // public async loadSaved() {
  //   // Retrieve cached photo array data
  //   const photoList = await Storage.get({ key: this.photoStorage });
  //   this.photos = JSON.parse(photoList.value) || [];
  //   // Display the photo by reading into base64 format
  //   for (const photo of this.photos) {
  //     // Read each saved photo's data from the Filesystem
  //     const readFile = await Filesystem.readFile({
  //       path: photo.filepath,
  //       directory: Directory.Data,
  //     });
  //   // Web platform only: Load the photo as base64 data
  //   photo.webviewPath = `data:image/jpeg;base64,${readFile.data}`;
  //   }
  // }
  public async loadSaved() {
    // Retrieve cached photo array data
    const photoList = await Storage.get({ key: this.photoStorage });
    this.photos = JSON.parse(photoList.value) || [];
    // Easiest way to detect when running on the web:
    // “when the platform is NOT hybrid, do this”
    if (!this.platform.is('hybrid')) {
      // Display the photo by reading into base64 format
      for (const photo of this.photos) {
        // Read each saved photo's data from the Filesystem
        const readFile = await Filesystem.readFile({
            path: photo.filepath,
            directory: Directory.Data
        });
        // Web platform only: Load the photo as base64 data
        photo.webviewPath = `data:image/jpeg;base64,${readFile.data}`;
      }
    }
  }
  // private async savePicture(photo: Photo) {
  //   // Convert photo to base64 format, required by Filesystem API to save
  //   const base64Data = await this.readAsBase64(photo);
  //   // Write the file to the data directory
  //   const fileName = new Date().getTime() + '.jpeg';
  //   const savedFile = await Filesystem.writeFile({
  //     path: fileName,
  //     data: base64Data,
  //     directory: Directory.Data
  //   });
  //   // Use webPath to display the new image instead of base64 since it's
  //   // already loaded into memory
  //   return {
  //     filepath: fileName,
  //     webviewPath: photo.webPath
  //   };
  // }
  // Save picture to file on device
  private async savePicture(photo: Photo) {
    // Convert photo to base64 format, required by Filesystem API to save
    const base64Data = await this.readAsBase64(photo);

    // Write the file to the data directory
    const fileName = new Date().getTime() + '.jpeg';
    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data
    });

    if (this.platform.is('hybrid')) {
      // Display the new image by rewriting the 'file://' path to HTTP
      // Details: https://ionicframework.com/docs/building/webview#file-protocol
      return {
        filepath: savedFile.uri,
        webviewPath: Capacitor.convertFileSrc(savedFile.uri),
      };
    }
    else {
      // Use webPath to display the new image instead of base64 since it's
      // already loaded into memory
      return {
        filepath: fileName,
        webviewPath: photo.webPath
      };
    }
  }
  // private async readAsBase64(photo: Photo) {
  //   // Fetch the photo, read as a blob, then convert to base64 format
  //   // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  //   const response = await fetch(photo.webPath!);
  //   const blob = await response.blob();
  //   return await this.convertBlobToBase64(blob) as string;
  // }
  private convertBlobToBase64 = (blob: Blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
        resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });
  private async readAsBase64(photo: Photo) {
    // "hybrid" will detect Cordova or Capacitor
    if (this.platform.is('hybrid')) {
      // Read the file into base64 format
      const file = await Filesystem.readFile({
        path: photo.path
      });
      return file.data;
    }
    else {
      // Fetch the photo, read as a blob, then convert to base64 format
      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      return await this.convertBlobToBase64(blob) as string;
    }
  }
}

export interface UserPhoto {
  filepath: string;
  webviewPath: string;
}
