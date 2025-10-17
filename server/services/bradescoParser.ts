import { ExtractedPolicyData } from '../../src/types';

// Parser dedicado para apólices Bradesco
export function parseBradescoPolicy(text: string): ExtractedPolicyData {
    // Remove quebras de linha e espaços múltiplos para melhor matching
    const cleanText = text.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();

    // Regex para número da apólice (ajuste conforme exemplos)
    const policyNumberMatch = text.match(/Ap[óo]lice\s*([\d.]+)/i);
    const policyNumber = policyNumberMatch ? policyNumberMatch[1].replace(/\D/g, "") : '';

    // Nome do segurado
    const nameMatch = text.match(/Nome \s*([A-ZÁÉÍÓÚÂÊÔÃÕÇ\s]+)(?:Data de Nascimento|CPF|Sexo)/i);
    const policyholderName = nameMatch ? nameMatch[1].trim() : '';

    // Telefone do segurado
    const phoneMatch = text.match(/Telefone Celular\s*(\(\s*\d{2}\s*\)\s*\d{4,5}[-\s]?\d{4})/i);
    const policyholderPhone = phoneMatch ? phoneMatch[1].trim() : '';

    // Email do segurado
    const emailRegex = /(?:E-?mail|Email)\s*:?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
    const emailMatch = cleanText.match(emailRegex);
    const policyholderEmail = emailMatch ? emailMatch[1].trim().toLowerCase() : '';

    // ASSET DETAILS - Descrição do veículo
    const assetMatch = text.match(/Marca\/Tipo Veículo\s*([^\n]+)(?:Ano de Fabricação)/i);
    const assetDetails = assetMatch ? assetMatch[1].trim() : '';

    // VIGÊNCIA - Datas de início e fim
    const vigenciaMatch = text.match(/Vigência\s*das\s*\d{2}:\d{2}\s*horas\s*do\s*dia\s*(\d{2}\/\d{2}\/\d{4})\s*às\s*\d{2}:\d{2}\s*horas\s*do\s*dia\s*(\d{2}\/\d{2}\/\d{4})/i);
    const startDate = vigenciaMatch ? convertDateFormat(vigenciaMatch[1]) : '';
    const endDate = vigenciaMatch ? convertDateFormat(vigenciaMatch[2]) : '';
    // Prêmio (valor)
    const premiumMatch = text.match(/Prêmio Total[\s:]*R?\$?\s*([\d.,]+)/i);
    const premium = premiumMatch ? premiumMatch[1].replace(/\./g, '').replace(',', '.') : '';

    // COVERAGE DETAILS - Coberturas completas
    const coverageDetails = extractCoverageDetailsRobust(text);


    return {
        policyNumber,
        policyholderName,
        policyholderPhone,
        policyholderEmail,
        startDate,
        endDate,
        premium,
        coverageDetails,
        insuranceType: '',
        assetType: '',
        assetDetails
    };
}

function convertDateFormat(dateStr: string): string {
    if (!dateStr) return '';

    // Divide a data em dia, mês e ano
    const parts = dateStr.split('/');
    if (parts.length !== 3) return '';

    const [day, month, year] = parts;

    // Retorna no formato YYYY-MM-DD
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// function extractCoverageDetails(text: string): string {
//     // Array para armazenar todas as seções de cobertura
//     const sections: string[] = [];

//     // 1. Seção de Coberturas
//     const coberturaMatch = text.match(/Coberturas\s*_{10,}([\s\S]*?)(?=Serviços Complementares)/i);
//     if (coberturaMatch) {
//         sections.push(coberturaMatch[1].trim());
//     }

//     // 2. Serviços Complementares
//     const servicosMatch = text.match(/Serviços Complementares\s*_{10,}([\s\S]*?)(?=Cláusulas do Seguro)/i);
//     if (servicosMatch) {
//         sections.push(`Serviços Complementares  _________________________________\n${servicosMatch[1].trim()}`);
//     }

//     // 3. Cláusulas do Seguro
//     const clausulasMatch = text.match(/Cláusulas do Seguro\s*_{10,}([\s\S]*?)(?=Franquia)/i);
//     if (clausulasMatch) {
//         sections.push(`Cláusulas do Seguro  _______________________________________\n${clausulasMatch[1].trim()}`);
//     }

//     // 4. Franquia
//     const franquiaMatch = text.match(/Franquia\s*_{10,}([\s\S]*?)(?=Participação do Segurado)/i);
//     if (franquiaMatch) {
//         sections.push(`Franquia  ___________________________________________________\n${franquiaMatch[1].trim()}`);
//     }

//     // 5. Participação do Segurado
//     const participacaoMatch = text.match(/Participação do Segurado\s*_{10,}([\s\S]*?)(?=Demonstrativo de Prêmio|$)/i);
//     if (participacaoMatch) {
//         sections.push(`Participação do Segurado  __________________________________\n${participacaoMatch[1].trim()}`);
//     }

//     // Junta todas as seções
//     return sections.join('\n');
// }

// Versão alternativa mais robusta para extrair coberturas
function extractCoverageDetailsRobust(text: string): string {
    // Encontra o início da seção de coberturas
    const startIndex = text.indexOf('Coberturas');
    const endIndex = text.indexOf('Demonstrativo de Prêmio');

    if (startIndex === -1 || endIndex === -1) {
        return '';
    }

    // Extrai toda a seção entre Coberturas e Demonstrativo
    const coverageSection = text.substring(startIndex, endIndex).trim();

    // Remove linhas vazias extras mas mantém a formatação
    return coverageSection.replace(/\n{3,}/g, '\n\n');
}


