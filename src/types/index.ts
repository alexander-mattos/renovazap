// Policy status enumeration
export enum PolicyStatus {
    ACTIVE = 'ACTIVE',
    EXPIRED = 'EXPIRED',
    CANCELLED = 'CANCELLED'
}

export interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    updatedAt: string;
}

export interface Policy {
    id: string;
    policyNumber: string;
    policyholderName: string;
    startDate: string;
    endDate: string;
    premium: number;
    coverageDetails: string;
    assetType?: string;
    assetDetails?: string;
    documentPath?: string;
    insuranceTypeId: string;
    insuranceType: InsuranceType;
    insuranceProviderId: string;
    insuranceProvider: InsuranceProvider;
    userId: string;
    user?: User;
    createdAt: string;
    updatedAt: string;
    notifications?: Notification[];
    // Campos adicionais para o formulário
    insuredName?: string;
    insuredCpf?: string;
    insuredPhone?: string;
    insuredEmail?: string;
    coverage?: string;
    coverageAmount: number;
    wellInsured?: string;
    issueDate?: string;
    expiryDate?: string;
    insurerName?: string;
    //Vehicle information
    vehiclePlate: string;
    chassi: string;
    vehicleYear: string;
    vehicleInfo: object
    status: PolicyStatus;
}

export interface ExtractedPolicyData {
    policyNumber?: string;
    insurerName?: string;
    insuranceType: string;
    policyholderName?: string;
    policyholderCpf?: string;
    policyholderPhone?: string;
    policyholderEmail?: string;
    startDate?: string;
    endDate?: string;
    premium?: string;
    coverageDetails?: string;
    wellInsured?: string;
    assetType?: string;
    assetDetails?: string;
    // Campos adicionais que podem ser úteis
    vehiclePlate?: string;
    vehicleModel?: string;
    vehicleBrand?: string;
    vehicleYear?: string;
}

// Policy entity with relationships
export interface PolicyData extends Policy {
    id: string;
    createdAt: string;
    updatedAt: string;
    notifications?: Notification[];
}

export interface Stats {
    totalPolicies: number;
    expiringPolicies: number;
    activeNotifications: number;
    totalUsers: number;
    renewalRate: number;
}

export interface InsuranceType {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    _count?: {
        policies: number;
    };
}

export interface InsuranceProvider {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
    _count?: {
        policies: number;
    };
}

export interface Notification {
    id: string;
    policyId: string;
    policy?: Policy;
    message: string;
    status: string;
    scheduledFor: string;
    sentAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface NotificationData {
    policyId: string;
    message: string;
    scheduledFor: Date;
    status: 'pending' | 'sent' | 'failed';
}

export interface MessageTemplate {
    id: string;
    name: string;
    content: string;
    daysBeforeExpiry: number;
    createdAt: string;
    updatedAt: string;
}

export interface WhatsAppSession {
    id: string;
    name: string;
    status: string;
    qrCode?: string;
    createdAt: string;
    updatedAt: string;
}

export interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    loading: boolean;
}

export interface ApiError {
    error: string;
    message?: string;
    statusCode?: number;
}

export interface TokenPayload {
    userId: string;
    email: string;
    role: string;
}

export interface FormData {
    name: string;
    description: string;
}