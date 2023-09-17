import { FFmpeg } from "@ffmpeg/ffmpeg";

import coreURL from "../ffmpeg/ffmpeg-core.js?url";
import wasmURL from "../ffmpeg/ffmpeg-core.wasm?url";
import workerURL from "../ffmpeg/ffmpeg-worker.js?url";

//FFmpeg lib, para poder manipular arquivos de audio no navegador;
let ffmpeg: FFmpeg | null;

export async function getFFmpeg() {
  //Se o FFmpeg já estiver sigo criada, apenas return ele
  if (ffmpeg) {
    return ffmpeg;
  }

  // Se não a gente cria uma isntancia do FFmpeg
  ffmpeg = new FFmpeg();

  //Se ele não foi carregado, a gente aguarda até que ele seja carregado e depois return ele;
  if (!ffmpeg.loaded) {
    await ffmpeg.load({
      coreURL,
      wasmURL,
      workerURL,
    });
  }

  return ffmpeg;
}

// baixar os arquivos do ffmpeg para poder utilizar nesse projeto

//ffmpeg-core.js
//ffmpeg-core.wasm
//ffmpeg-worker.js
