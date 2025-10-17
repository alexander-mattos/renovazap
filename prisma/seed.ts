// server/prisma/seed.ts
import prisma from '../src/lib/prisma';
import bcrypt from 'bcrypt';

async function main() {
    console.log('🌱 Iniciando seed do banco de dados...');

    // Create default admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@renovazap.com' },
        update: {},
        create: {
            name: 'Administrador',
            email: 'admin@renovazap.com',
            password: hashedPassword,
            role: 'admin',
        },
    });

    console.log('Created admin user:', admin);

    // Criar tipos de seguro comuns
    const insuranceTypes = [
        { name: 'Seguro Auto', description: 'Cobertura para veículos automotores' },
        { name: 'Seguro Residencial', description: 'Proteção para imóveis residenciais' },
        { name: 'Seguro Vida', description: 'Cobertura em caso de morte ou invalidez' },
        { name: 'Seguro Saúde', description: 'Cobertura para despesas médicas e hospitalares' },
        { name: 'Seguro Empresarial', description: 'Proteção para empresas e comércios' },
        { name: 'Seguro Viagem', description: 'Cobertura para viagens nacionais e internacionais' },
        { name: 'Seguro Equipamentos', description: 'Proteção para equipamentos eletrônicos' },
        { name: 'Seguro Responsabilidade Civil', description: 'Cobertura para danos causados a terceiros' },
        { name: 'Seguro Responsabilidade Civil Profissional', description: 'Cobertura para danos causados a terceiros por profissionais' },
        { name: 'Seguro Garantia', description: 'Garantia de cumprimento de contratos' },
        { name: 'Seguro Pet', description: 'Cobertura veterinária para animais de estimação' }
    ];

    console.log('📋 Criando tipos de seguro...');
    for (const type of insuranceTypes) {
        await prisma.insuranceType.upsert({
            where: { name: type.name },
            update: {},
            create: type
        });
        console.log(`  ✅ ${type.name}`);
    }

    // Criar seguradoras comuns no Brasil
    const insuranceProviders = [
        { name: 'Porto Seguro', description: 'Uma das maiores seguradoras do Brasil' },
        { name: 'Bradesco Seguros', description: 'Seguradora do grupo Bradesco' },
        { name: 'SulAmérica', description: 'Tradicional seguradora brasileira' },
        { name: 'Tokio Marine', description: 'Seguradora japonesa com forte presença no Brasil' },
        { name: 'Allianz', description: 'Seguradora alemã de atuação global' },
        { name: 'Liberty Seguros', description: 'Seguradora americana presente no Brasil' },
        { name: 'HDI Seguros', description: 'Seguradora alemã com operações no Brasil' },
        { name: 'Mapfre', description: 'Seguradora espanhola com presença nacional' },
        { name: 'Zurich', description: 'Seguradora suíça de atuação internacional' },
        { name: 'Azul Seguros', description: 'Seguradora brasileira do grupo Porto Seguro' },
        { name: 'Itaú Seguros', description: 'Seguradora do grupo Itaú Unibanco' },
        { name: 'BB Seguros', description: 'Seguradora do Banco do Brasil' },
        { name: 'Caixa Seguros', description: 'Seguradora da Caixa Econômica Federal' },
        { name: 'Sompo Seguros', description: 'Seguradora japonesa com operações no Brasil' },
        { name: 'AXA', description: 'Seguradora francesa de atuação global' }
    ];

    console.log('\n🏢 Criando seguradoras...');
    for (const provider of insuranceProviders) {
        await prisma.insuranceProvider.upsert({
            where: { name: provider.name },
            update: {},
            create: provider
        });
        console.log(`  ✅ ${provider.name}`);
    }

    // Criar templates de mensagem padrão
    console.log('\n📱 Criando templates de mensagem...');
    const messageTemplates = [
        {
            id: '1',
            name: 'Lembrete 30 dias',
            content: 'Olá {{nome}}! Sua apólice {{numero}} do {{tipo}} vence em 30 dias ({{data}}). Entre em contato conosco para renovar!',
            daysBeforeExpiry: 30
        },
        {
            id: '2',
            name: 'Lembrete 15 dias',
            content: 'Atenção {{nome}}! Faltam apenas 15 dias para o vencimento da sua apólice {{numero}}. Não deixe para última hora!',
            daysBeforeExpiry: 15
        },
        {
            id: '3',
            name: 'Lembrete 7 dias',
            content: 'URGENTE {{nome}}! Sua apólice {{numero}} vence em 7 dias. Renove agora e mantenha sua proteção!',
            daysBeforeExpiry: 7
        },
        {
            id: '4',
            name: 'Último aviso',
            content: '⚠️ ÚLTIMO AVISO {{nome}}! Sua apólice {{numero}} vence AMANHÃ. Renove hoje mesmo para não ficar desprotegido!',
            daysBeforeExpiry: 1
        }
    ];

    for (const template of messageTemplates) {
        await prisma.messageTemplate.upsert({
            where: {
                id: template.id
            },
            update: {},
            create: template
        });
        console.log(`  ✅ ${template.name}`);
    }

    console.log('\n✨ Seed concluído com sucesso!');
}

main()
    .catch((e) => {
        console.error('❌ Erro durante o seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });