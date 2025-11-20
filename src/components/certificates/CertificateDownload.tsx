import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import logoNewStandard from "@/assets/logo-newstandard.png";

interface CertificateDownloadProps {
  courseTitle: string;
  studentName: string;
  certificateNumber: string;
  issuedAt: string;
  totalHours: number;
}

const drawCertificate = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  logo: HTMLImageElement,
  {
    courseTitle,
    studentName,
    certificateNumber,
    issuedAt,
    totalHours,
  }: CertificateDownloadProps
) => {
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#0B7BF5');
  gradient.addColorStop(1, '#2D9F5D');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // White background with margin
  ctx.fillStyle = 'white';
  ctx.fillRect(40, 40, canvas.width - 80, canvas.height - 80);

  // Border decoration
  ctx.strokeStyle = '#0B7BF5';
  ctx.lineWidth = 3;
  ctx.strokeRect(60, 60, canvas.width - 120, canvas.height - 120);

  // Draw logo at top
  const logoWidth = 150;
  const logoHeight = (logo.height / logo.width) * logoWidth;
  ctx.drawImage(logo, (canvas.width - logoWidth) / 2, 70, logoWidth, logoHeight);

  // Title
  ctx.fillStyle = '#0B7BF5';
  ctx.font = 'bold 60px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('CERTIFICADO', canvas.width / 2, 180);

  // Subtitle
  ctx.font = '24px Arial';
  ctx.fillStyle = '#666';
  ctx.fillText('DE CONCLUSÃO', canvas.width / 2, 220);

  // Main text
  ctx.font = '20px Arial';
  ctx.fillStyle = '#333';
  ctx.fillText('Certificamos que', canvas.width / 2, 310);

  // Student name
  ctx.font = 'bold 40px Arial';
  ctx.fillStyle = '#0B7BF5';
  ctx.fillText(studentName, canvas.width / 2, 370);

  // Course completion text
  ctx.font = '20px Arial';
  ctx.fillStyle = '#333';
  ctx.fillText('concluiu com sucesso o curso de', canvas.width / 2, 430);

  // Course title
  ctx.font = 'bold 32px Arial';
  ctx.fillStyle = '#2D9F5D';
  
  // Wrap course title if too long
  const maxWidth = canvas.width - 200;
  const words = courseTitle.split(' ');
  let line = '';
  let y = 490;
  
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), canvas.width / 2, y);
      line = words[i] + ' ';
      y += 40;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), canvas.width / 2, y);

  // Total hours
  ctx.font = '18px Arial';
  ctx.fillStyle = '#666';
  ctx.fillText(`Carga horária: ${totalHours} horas`, canvas.width / 2, y + 50);

  // Date
  ctx.font = '18px Arial';
  ctx.fillStyle = '#666';
  const formattedDate = format(new Date(issuedAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  ctx.fillText(`Emitido em ${formattedDate}`, canvas.width / 2, 640);

  // Certificate number
  ctx.font = '14px monospace';
  ctx.fillStyle = '#999';
  ctx.fillText(`Certificado Nº ${certificateNumber}`, canvas.width / 2, 690);

  // Signature line
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - 150, 750);
  ctx.lineTo(canvas.width / 2 + 150, 750);
  ctx.stroke();

  ctx.font = '16px Arial';
  ctx.fillStyle = '#333';
  ctx.fillText('NewWar', canvas.width / 2, 775);
};

export const generateCertificateImage = (
  props: CertificateDownloadProps
): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 850;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      resolve('');
      return;
    }

    const logo = new Image();
    logo.crossOrigin = 'anonymous';
    logo.src = logoNewStandard;
    
    logo.onload = () => {
      drawCertificate(ctx, canvas, logo, props);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          resolve(url);
        } else {
          resolve('');
        }
      });
    };
    
    logo.onerror = () => {
      resolve('');
    };
  });
};

export const generateCertificatePDF = async (props: CertificateDownloadProps) => {
  const url = await generateCertificateImage(props);
  
  if (url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = `certificado-${props.certificateNumber}.png`;
    link.click();
    URL.revokeObjectURL(url);
  }
};
