// server/services/policyExtractor.ts

import PDFParser from 'pdf2json';
import { ExtractedPolicyData } from '../../src/types';
import { parseBradescoPolicy } from './bradescoParser';
import { parseAzulPolicy } from './azulParser';

export async function extractPolicyData(buffer: Buffer): Promise<ExtractedPolicyData> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser()

    pdfParser.on('pdfParser_dataError', (errData: any) => {
      console.error('PDF parsing error:', errData.parserError || 'Unknown error');
      try {
        const rawText = buffer.toString();
        console.log('Texto extraído no fallback:', rawText?.substring(0, 500)); // Mostra os primeiros 500 caracteres
        if (rawText && rawText.length > 100) {
          console.log('Usando extração de texto de emergência');
          resolve({
            policyNumber: '',
            policyholderName: '',
            policyholderPhone: '',
            policyholderEmail: '',
            startDate: undefined,
            endDate: undefined,
            premium: undefined,
            coverageDetails: '',
            assetType: '',
            assetDetails: '',
            rawText // Inclua o texto bruto para debug
          } as any);
          return;
        }
      } catch (e) {
        console.error('Extração de texto de emergência falhou:', e);
      }
      reject(new Error(`PDF parsing failed: ${errData.parserError || 'Unknown error'}`));
    });

    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      try {
        let fullText = '';

        if (pdfData.Pages) {
          pdfData.Pages.forEach((page: any) => {
            if (page.Texts) {
              page.Texts.forEach((text: any) => {
                if (text.R) {
                  text.R.forEach((r: any) => {
                    if (r.T) {
                      try {
                        const decodedText = decodeURIComponent(r.T);
                        fullText += decodedText + ' ';
                      } catch (e) {
                        // Em caso de erro de decodificação, use o texto bruto
                        fullText += r.T + ' ';
                      }
                    }
                  });
                }
              });
              fullText += '\n';
            }
          });
        }

        if (fullText.length < 100) {
          // Se o texto extraído for muito curto, tente a extração direta
          const rawText = buffer.toString();
          if (rawText && rawText.length > fullText.length) {
            fullText = rawText;
          }
        }
        console.log('Texto extraído do PDF:', fullText?.substring(0, 500)); // Mostra os primeiros 500 caracteres

        // Identifica seguradora pelo texto e usa o parser dedicado se for Bradesco
        if (/bradesco/i.test(fullText)) {
          const parsed = parseBradescoPolicy(fullText);
          resolve(parsed);
          return;
        }

        if (/azul/i.test(fullText)) {
          const parsed = parseAzulPolicy(fullText);
          resolve(parsed);
          return;
        }

        // Caso não seja Bradesco, pode adicionar outros parsers aqui
        // resolve(parsedFromOtherParser);

        // Fallback: retorna texto bruto
        resolve({
          policyNumber: '',
          policyholderName: '',
          policyholderPhone: '',
          policyholderEmail: '',
          startDate: undefined,
          endDate: undefined,
          premium: undefined,
          coverageDetails: '',
          assetType: '',
          assetDetails: '',
          rawText: fullText
        } as any);
      } catch (error) {
        console.error('Erro na extração de texto:', error);

        // Tente extração de emergência em caso de erro
        try {
          const rawText = extractDate(buffer.toString());
          if (rawText && rawText.length > 100) {
            resolve({
              policyNumber: '',
              policyholderName: '',
              policyholderPhone: '',
              policyholderEmail: '',
              startDate: undefined,
              endDate: undefined,
              premium: undefined,
              coverageDetails: '',
              assetType: '',
              assetDetails: '',
              rawText // Inclua o texto bruto para debug
            } as any);
            return;
          }
        } catch (e) {
          console.error('Extração de emergência falhou:', e);
        }

        reject(error);
      }
    });

    // Parse the PDF buffer
    try {
      pdfParser.parseBuffer(buffer);
    } catch (error) {
      console.error('Erro ao iniciar parsing do PDF:', error);

      // Tente extração de emergência em caso de erro
      try {
        const rawText = extractDate(buffer.toString());
        if (rawText && rawText.length > 100) {
          resolve({
            policyNumber: '',
            policyholderName: '',
            policyholderPhone: '',
            policyholderEmail: '',
            startDate: undefined,
            endDate: undefined,
            premium: undefined,
            coverageDetails: '',
            assetType: '',
            assetDetails: '',
            rawText // Inclua o texto bruto para debug
          } as any);
          return;
        }
      } catch (e) {
        console.error('Extração de emergência falhou:', e);
      }

      reject(error);
    }
  });
}

// Função para extrair datas
function extractDate(text: string, ...keywords: string[]): string | undefined {
  // Padrões de data brasileiros
  const datePatterns = [
    /(\d{1,2})[\s]*[\/\-\.][\s]*(\d{1,2})[\s]*[\/\-\.][\s]*(\d{2,4})/g,
    /(\d{1,2})[\s]+de[\s]+(\w+)[\s]+de[\s]+(\d{2,4})/gi,
  ];

  const months: { [key: string]: string } = {
    'janeiro': '01', 'jan': '01',
    'fevereiro': '02', 'fev': '02',
    'março': '03', 'mar': '03',
    'abril': '04', 'abr': '04',
    'maio': '05', 'mai': '05',
    'junho': '06', 'jun': '06',
    'julho': '07', 'jul': '07',
    'agosto': '08', 'ago': '08',
    'setembro': '09', 'set': '09',
    'outubro': '10', 'out': '10',
    'novembro': '11', 'nov': '11',
    'dezembro': '12', 'dez': '12',
  };

  // Procurar por palavras-chave seguidas de data
  for (const keyword of keywords) {
    const keywordRegex = new RegExp(`${keyword}[^\\d]{0,20}(\\d{1,2}[\\s\\/\\-\\.]\\d{1,2}[\\s\\/\\-\\.]\\d{2,4})`, 'i');
    const match = text.match(keywordRegex);
    if (match && match[1]) {
      const dateParts = match[1].match(/(\d{1,2})[^\d]+(\d{1,2})[^\d]+(\d{2,4})/);
      if (dateParts) {
        const [_, day, month, year] = dateParts;
        const fullYear = year.length === 2 ? `20${year}` : year;
        const isoDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        return isoDate;
      }
    }
  }

  // Tentar encontrar qualquer data no texto
  const allDates: string[] = [];
  let match;

  // Datas numéricas
  const numericDateRegex = /(\d{1,2})[\s]*[/\-.][\s]*(\d{1,2})[\s]*[/\-.][\s]*(\d{2,4})/g;
  while ((match = numericDateRegex.exec(text)) !== null) {
    const [_, day, month, year] = match;
    const fullYear = year.length === 2 ? `20${year}` : year;
    allDates.push(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
  }

  // Se estamos procurando data de início, pegar a primeira
  // Se estamos procurando data de término, pegar a última
  if (allDates.length > 0) {
    if (keywords.some(k => k.includes('início') || k.includes('vigência'))) {
      return allDates[0];
    } else {
      return allDates[allDates.length - 1];
    }
  }

  return undefined;
}
