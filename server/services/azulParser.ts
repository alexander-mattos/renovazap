import { ExtractedPolicyData } from '../../src/types';

export function parseAzulPolicy(policyText: string): ExtractedPolicyData {
    // Remove quebras de linha e espaços múltiplos para melhor matching
    const cleanText = policyText.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();

    // Extrair número da apólice
    const policyNumberMatch = policyText.match(/(?:Nº\.? (?:da )?Apólice|Nr\. Apólice)[\s:]*(\d+)/i);
    const policyNumber = policyNumberMatch ? policyNumberMatch[1] : '';

    // Nome do segurado
    const nameMatch = policyText.match(
        /NOME DO SEGURADO\(A\):\s*([A-ZÁÉÍÓÚÂÊÔÃÕÇ\s]+?)\s*(?=[A-Z]{2,}:|\n|$)/i
    ) || policyText.match(
        /Nome civil do segurado\(a\):\s*([A-ZÁÉÍÓÚÂÊÔÃÕÇ\s]+?)\s*(?=[A-Z][a-z]|$)/i
    );

    const policyholderName = nameMatch ? nameMatch[1].trim() : '';

    // Telefone
    const phoneMatch = policyText.match(/(?:Celular|Telefone)[\s:]*(\(\d{2}\)\s*\d{4,5}[-\s]?\d{4})/i);
    const policyholderPhone = phoneMatch ? phoneMatch[1].trim() : '';

    // Email
    const emailRegex = /(?:E-?mail|Email)\s*:?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
    const emailMatch = cleanText.match(emailRegex);
    const policyholderEmail = emailMatch ? emailMatch[1].trim().toLowerCase() : '';

    // Detalhes do bem (veículo)
    const assetMatch = policyText.match(/(?:Modelo|Veículo)[\s:]*([^\n]+)(?:Ano|Placa|Chassi)/i);
    const assetDetails = assetMatch ? assetMatch[1].trim() : '';

    // Datas de vigência
    const startDateMatch = policyText.match(/Vigência:\s*Das\s*24h\s*do\s*dia\s*(\d{2}\/\d{2}\/\d{4})/i);
    const endDateMatch = policyText.match(/às\s*24h\s*do\s*dia\s*(\d{2}\/\d{2}\/\d{4})/i);

    const startDate = startDateMatch
        ? convertDateFormat(startDateMatch[1])
        : undefined;

    const endDate = endDateMatch
        ? convertDateFormat(endDateMatch[1])
        : undefined;

    // Prêmio total
    const premiumMatch = policyText.match(/(?:Total\s*(?:do\s*)?seguro|Total\s*prêmio\s*coberturas)[\s:]*R\$\s*([\d.,]+)/i);
    const premium = premiumMatch
        ? (premiumMatch[1].replace('.', '').replace(',', '.'))
        : undefined;

    // Detalhes de cobertura
    const coverageMatch = policyText.match(/Coberturas[:\s]+([^.]{20,300})/i);
    const coverageDetails = coverageMatch
        ? coverageMatch[1].trim()
        : 'Coberturas conforme apólice';

    // Tipo de seguro (baseado nos dados disponíveis)
    const insuranceType = policyText.toLowerCase().includes('auto') || policyText.toLowerCase().includes('veículo')
        ? 'Automóvel'
        : 'Outro';

    // Tipo de bem (baseado nos dados disponíveis)
    const assetType = 'Veículo';

    return {
        policyNumber,
        policyholderName,
        policyholderPhone,
        policyholderEmail,
        startDate,
        endDate,
        premium,
        coverageDetails,
        insuranceType,
        assetType,
        assetDetails
    };
}

// Função auxiliar para converter formato de data
function convertDateFormat(dateStr: string): string {
    if (!dateStr) return '';

    // Divide a data em dia, mês e ano
    const parts = dateStr.split('/');
    if (parts.length !== 3) return '';

    const [day, month, year] = parts;

    // Retorna no formato YYYY-MM-DD
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export default parseAzulPolicy;