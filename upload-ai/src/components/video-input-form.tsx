import { FileVideo, Upload } from "lucide-react";
import { Separator } from "./ui/separator";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { api } from "@/lib/axios";

type Status = "waiting" | "converting" | "uploading" | "generating" | "success";

const statusMessage = {
  converting: "Convertendo...",
  uploading: "Carregando...",
  generating: "Transcrevendo...",
  success: "Sucesso!",
};

interface VideoInputFormProps {
  onVideoUploaded: (id: string) => void;
}

export function VideoInputForm({ onVideoUploaded }: VideoInputFormProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("waiting");

  const promptInputRef = useRef<HTMLTextAreaElement>(null);

  const handleFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const { files } = event.currentTarget;

    if (!files) {
      return;
    }

    const selectedFile = files.item(0);

    setVideoFile(selectedFile);
  };

  const convertVideoToAudio = async (video: File) => {
    console.log("Convert started");

    const ffmpeg = await getFFmpeg(); //carrega a função do FFmpeg que nós criamos

    // writeFile => vai escrever e armazena o arquivo isolado; 'input.mp4': colocamos o nome que quiser; fetchFile é assincrono converter o arquivo video;
    await ffmpeg.writeFile("input.mp4", await fetchFile(video));

    /*
      //TODO: carrega logs, pra ver se tem algum erro(opicional)
      ffmpeg.on('log', log => {
      console.log(log)
    })
    */

    // Ver o progresso da conversão
    ffmpeg.on("progress", (progress) => {
      console.log("Convert progress: " + Math.round(progress.progress) * 100);
    });

    //config de conversão, você pode consultar comands ffmpeg exec no ChatGPT, saida do arquivo 'output.mp3'
    await ffmpeg.exec([
      "-i",
      "input.mp4",
      "-map",
      "0:a",
      "-b:a",
      "20k",
      "-acodec",
      "libmp3lame",
      "output.mp3",
    ]);

    //ler o arquivo output.mp3 que vai estar em 'FileData': ffmpeg
    const data = await ffmpeg.readFile("output.mp3");

    //Converter o FileData para um arquivo audio
    const audioFileBlob = new Blob([data], { type: "audio/mpeg" });
    const audioFile = new File([audioFileBlob], "audio.mp3", {
      type: "audio/mpeg",
    });

    console.log("Convert Finished");
    return audioFile;
  };

  const handleUploadVideo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const prompt = promptInputRef.current?.value;

    if (!videoFile) {
      return;
    }

    setStatus("converting");

    // Converter o Video em áudio
    const audioFile = await convertVideoToAudio(videoFile);

    //Enviando dados para um formato do tipo FormData()
    const data = new FormData();

    //adicionando campo nesse dado do tipo FormData;
    data.append("file", audioFile);

    setStatus("uploading");
    //Enviando dados para a API
    const response = await api.post("/videos", data);

    //pegar o id do video
    const videoId = response.data.video.id;

    setStatus("generating");

    //Gerar transcrição do video
    await api.post(`/videos/${videoId}/transcription`, {
      prompt,
    });

    setStatus("success");
    onVideoUploaded(videoId)
  };

  //UseMemo para evitar que seja renderizado toda vez o VideoFile
  const previewURL = useMemo(() => {
    if (!videoFile) {
      return null;
    }
    return URL.createObjectURL(videoFile); //URL.createObjectURL => Cria uma URL de uma previsualição do arquivo
  }, [videoFile]);

  return (
    <form onSubmit={handleUploadVideo} className="space-y-6">
      <label
        htmlFor="video"
        className="relative border flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 items-center justify-center text-muted-foreground hover:bg-primary/10"
      >
        {previewURL ? (
          <video
            src={previewURL}
            controls={false}
            className="pointer-events-none absolute inset-0"
          />
        ) : (
          <>
            <FileVideo className="w-4 h-4" />
            Selecione um vídeo
          </>
        )}
      </label>

      <input
        type="file"
        id="video"
        accept="video/mp4"
        className="sr-only"
        onChange={handleFileSelected}
      />

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="transcription_prompt">Prompt de transcrição</Label>
        <Textarea
          disabled={status !== "waiting"}
          ref={promptInputRef}
          id="transcription_prompt"
          className="h-20 leading-relaxed resize-none"
          placeholder="Inclua palavras-chaves mencinadas durante o vídeo separadas por vírgula (,)"
        />
      </div>

      <Button type="submit" 
      data-success={status === 'success'}
      className="w-full data-[success=true]:bg-emerald-400" 
      disabled={status !== "waiting"}
      >
        {status === "waiting" ? (
          <>
            Carregar vídeo
            <Upload className="w-4 h-4 ml-2" />
          </>
        ) : (
          statusMessage[status]
        )}
      </Button>
    </form>
  );
}
