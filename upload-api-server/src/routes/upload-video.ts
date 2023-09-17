import { FastifyInstance } from "fastify";
import { fastifyMultipart } from "@fastify/multipart";

import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import { pipeline } from "node:stream"; //armazena e escreve um upload no "disco"
import { promisify } from "node:util"; // Transforma uma função antiga do node em assincrona

import { prisma } from "../lib/prisma";

const pump = promisify(pipeline);

export async function uploadVideoRoute(app: FastifyInstance) {
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 1_048_576 * 25, // 25mb
    },
  });

  app.post("/videos", async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.status(404).send({ error: "Missing File input" });
    }

    const extension = path.extname(data.filename); // pega a extensão do arquivo example: .mp3

    if (extension !== ".mp3") {
      return reply
        .status(400)
        .send({ error: "Invalid input type, please upload a mp3" });
    }

    // pega apenas o nome do arquivo example: music.mp3 > music
    const fileBaseName = path.basename(data.filename, extension);
    const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}`; //cria um único name para este arquivo

    //Salvar o arquivo em uma pasta ou caminho, path.resolve(__dirname) : ele indica a pasta atual onde está esse upload-video.ts : routes, segundo argumento é onde eu quero salvar o arquivo.

    const uploadDestination = path.resolve(
      __dirname,
      "../../tmp",
      fileUploadName
    );

    // pega o arquivo e escreve ele no local, passando o seu caminho destino.
    await pump(data.file, fs.createWriteStream(uploadDestination));


    // Cria no banco de dados na tabela video, name e path;
    const video = await prisma.video.create({
      data: {
        name: data.filename,
        path: uploadDestination
      }
    });

    return { video };
  });
}
