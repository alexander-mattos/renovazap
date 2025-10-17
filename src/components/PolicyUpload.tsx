'use client';

import { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2, CheckCircle, Save } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import { InsuranceProvider, InsuranceType } from '../types';

// Interface para os dados da apólice
interface PolicyData {
  policyNumber: string;
  policyholderName: string;
  startDate: Date | string;
  endDate: Date | string;
  premium: number;
  coverageDetails: string;
  assetType: string;
  assetDetails: string;
  insuranceProviderId: string;
  insuranceTypeId: string;
  insuranceType: string;
  documentPath: string;
}

// Custom hook for policy upload and review
function usePolicyUpload() {
  const [step, setStep] = useState<'upload' | 'review' | 'saving' | 'success' | 'error'>('upload');
  const [selectedInsurer, setSelectedInsurer] = useState<string>('');
  const [selectedInsuranceType, setSelectedInsuranceType] = useState<string>('');
  const [extractedData, setExtractedData] = useState<PolicyData | null>(null);
  const [editableData, setEditableData] = useState<PolicyData | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 1. Upload e extração
  const uploadAndExtract = async (file: File) => {
    if (!selectedInsurer || !selectedInsuranceType) {
      setError('Selecione a seguradora e o tipo de seguro');
      return null;
    }
    const formData = new FormData();
    formData.append('policyDocument', file);
    try {
      setLoading(true);
      setError(null);
      const response = await api.post('/policies/extract', formData);
      if (response.data.extracted && response.data.filePath) {
        const dataToEdit: PolicyData = {
          ...response.data.extracted,
          insuranceProviderId: selectedInsurer,
          insuranceTypeId: selectedInsuranceType,
          insuranceType: response.data.extracted.insuranceType,
          documentPath: response.data.filePath,
        };
        setExtractedData(dataToEdit);
        setEditableData(dataToEdit);
        setUploadedFile(file);
        setStep('review');
      } else {
        throw new Error('Resposta inválida do servidor');
      }
    } catch (error: any) {
      console.error('Erro no upload:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Falha ao processar apólice';
      setError(errorMessage);
      setStep('error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 2. Salvar apólice com JSON
  const savePolicy = async () => {
    if (!editableData) return;
    setLoading(true);
    setError(null);
    try {
      // Garante datas no formato yyyy-MM-dd
      const formatDate = (d: any) => {
        if (!d) return '';
        const date = new Date(d);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().slice(0, 10);
      };
      const payload = {
        ...editableData,
        startDate: formatDate(editableData.startDate),
        endDate: formatDate(editableData.endDate),
        insuranceProviderId: selectedInsurer,
        insuranceTypeId: selectedInsuranceType,
        insuranceType: editableData.insuranceType,
        documentPath: editableData.documentPath,
      };

      const response = await api.post('/policies', payload);
      if (response.data.policy) {
        setLoading(true);
        setStep('saving');
        // Use o id retornado para atualizar
        const policyId = response.data.policy.id;
        const putResponse = await api.put(`/policies/${policyId}`, payload);
        setStep('success');
        return putResponse.data.policy;
      }
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      setError(error.response?.data?.message || 'Falha ao salvar apólice');
      setStep('error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof PolicyData, value: any) => {
    if (editableData) {
      // special handling for dates: when startDate changes, auto-set endDate = +1 year
      if (field === 'startDate') {
        try {
          const sd = new Date(value);
          if (!isNaN(sd.getTime())) {
            const ed = new Date(sd);
            ed.setFullYear(ed.getFullYear() + 1);
            // store ISO strings for consistency
            setEditableData({ ...editableData, startDate: sd.toISOString(), endDate: ed.toISOString() });
            return;
          }
        } catch (e) {
          // fallback to straightforward set
        }
      }

      // allow overriding endDate manually
      if (field === 'endDate') {
        try {
          const ed = new Date(value);
          if (!isNaN(ed.getTime())) {
            setEditableData({ ...editableData, endDate: ed.toISOString() });
            return;
          }
        } catch (e) {}
      }

      setEditableData({ ...editableData, [field]: value });
    }
  };

  const reset = () => {
    setStep('upload');
    setSelectedInsurer('');
    setSelectedInsuranceType('');
    setExtractedData(null);
    setEditableData(null);
    setUploadedFile(null);
    setError(null);
  };

  return {
    step,
    selectedInsurer,
    selectedInsuranceType,
    setSelectedInsurer,
    setSelectedInsuranceType,
    extractedData,
    editableData,
    uploadedFile,
    error,
    loading,
    uploadAndExtract,
    savePolicy,
    updateField,
    reset
  };
}

// Review Form Component
const ReviewForm = ({ data, onUpdate, onSave, onCancel, loading, insurerName }: any) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Revisar Dados da Apólice</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número da Apólice
          </label>
          <input
            type="text"
            value={data.policyNumber || ''}
            onChange={(e) => onUpdate('policyNumber', e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Seguradora
          </label>
          <input
            type="text"
            value={insurerName}
            disabled
            className="w-full px-3 py-2 border rounded-md bg-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Seguro
          </label>
          <input
            type="text"
            value={data.insuranceType || ''}
            disabled
            className="w-full px-3 py-2 border rounded-md bg-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome do Segurado
          </label>
          <input
            type="text"
            value={data.policyholderName || ''}
            onChange={(e) => onUpdate('policyholderName', e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telefone
          </label>
          <input
            type="text"
            value={data.policyholderPhone || ''}
            onChange={(e) => onUpdate('policyholderPhone', e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            E-mail
          </label>
          <input
            type="email"
            value={data.policyholderEmail || ''}
            onChange={(e) => onUpdate('policyholderEmail', e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Bem
          </label>
          <select
            value={data.assetType || ''}
            onChange={(e) => onUpdate('assetType', e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione</option>
            <option value="Veículo">Veículo</option>
            <option value="Imóvel">Imóvel</option>
            <option value="Vida">Vida</option>
            <option value="Eletrônico">Eletrônico</option>
            <option value="Empresa">Empresa</option>
            <option value="Outro">Outro</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Detalhes do Bem
          </label>
          <input
            type="text"
            value={data.assetDetails || ''}
            onChange={(e) => onUpdate('assetDetails', e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Honda Civic 2020, Placa ABC-1234"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prêmio (R$)
          </label>
          <input
            type="number"
            step="0.01"
            value={typeof data.premium === 'number' ? data.premium : ''}
            onChange={(e) => onUpdate('premium', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data de Início
          </label>
          <input
            type="date"
            value={data.startDate ? format(new Date(data.startDate), 'yyyy-MM-dd') : ''}
            onChange={(e) => onUpdate('startDate', e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data de Término
          </label>
          <input
            type="date"
            value={data.endDate ? format(new Date(data.endDate), 'yyyy-MM-dd') : ''}
            onChange={(e) => onUpdate('endDate', e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Detalhes da Cobertura
          </label>
          <textarea
            value={data.coverageDetails || ''}
            onChange={(e) => onUpdate('coverageDetails', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Descreva os detalhes da cobertura do seguro"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Apólice
        </button>
      </div>
    </div>
  );
};

// Componente principal
const UploadPolicy = ({ onUploadComplete }: { onUploadComplete?: (result: any) => void }) => {
  const [insuranceProviders, setInsuranceProviders] = useState<InsuranceProvider[]>([]);
  const [insuranceTypes, setInsuranceTypes] = useState<InsuranceType[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoadingOptions(true);
        const [providersRes, typesRes] = await Promise.all([
          api.get('/insurance-providers'),
          api.get('/insurance-types')
        ]);
        setInsuranceProviders(providersRes.data);
        setInsuranceTypes(typesRes.data);
      } catch (error) {
        console.error('Erro ao buscar opções:', error);
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchOptions();
  }, []);

  const {
    step,
    selectedInsurer,
    selectedInsuranceType,
    setSelectedInsurer,
    setSelectedInsuranceType,
    editableData,
    error,
    loading,
    uploadAndExtract,
    savePolicy,
    updateField,
    reset
  } = usePolicyUpload();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    onDrop: async (acceptedFiles, fileRejections) => {
      if (fileRejections.length > 0) {
        console.error('Arquivo rejeitado:', fileRejections[0]);
        return;
      }

      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        await uploadAndExtract(file);
      }
    },
  });

  const handleSave = async () => {
    const policy = await savePolicy();
    if (policy && onUploadComplete) {
      onUploadComplete({ policy });
      setTimeout(reset, 3000);
    }
  };

  // Encontrar nomes para exibir
  const insurerName = insuranceProviders.find(p => p.id === selectedInsurer)?.name || '';
  const typeName = insuranceTypes.find(t => t.id === selectedInsuranceType)?.name || '';

  if (step === 'review' && editableData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <ReviewForm
          data={editableData}
          onUpdate={updateField}
          onSave={handleSave}
          onCancel={reset}
          loading={loading}
          insurerName={insurerName}
          typeName={typeName}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Seleção de seguradora e tipo de seguro */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Seguradora *
          </label>
          <select
            value={selectedInsurer}
            onChange={(e) => setSelectedInsurer(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading || loadingOptions}
          >
            <option value="">Selecione a seguradora</option>
            {insuranceProviders.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Seguro *
          </label>
          <select
            value={selectedInsuranceType}
            onChange={(e) => setSelectedInsuranceType(e.target.value)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading || loadingOptions}
          >
            <option value="">Selecione o tipo</option>
            {insuranceTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Upload area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${loading ? 'opacity-50 cursor-not-allowed' : ''}
          ${step === 'success' ? 'border-green-500 bg-green-50' : ''}
          ${step === 'error' ? 'border-red-500 bg-red-50' : ''}
          ${(!selectedInsurer || !selectedInsuranceType) ? 'opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} disabled={loading || step !== 'upload' || !selectedInsurer || !selectedInsuranceType} />

        {step === 'success' ? (
          <div className="flex flex-col items-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-green-600 font-medium">Apólice salva com sucesso!</p>
            <button
              onClick={reset}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700"
            >
              Carregar outra apólice
            </button>
          </div>
        ) : step === 'error' ? (
          <div className="flex flex-col items-center">
            <p className="text-red-600 mb-2">Erro ao processar</p>
            <p className="text-sm text-gray-500">{error || 'Por favor, tente novamente'}</p>
            <button
              onClick={reset}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700"
            >
              Tentar novamente
            </button>
          </div>
        ) : step === 'saving' || loading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
            <p className="text-gray-600">
              {step === 'saving' ? 'Salvando apólice...' : 'Processando PDF...'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {isDragActive ? (
              <FileText className="h-12 w-12 text-blue-500 mb-4" />
            ) : (
              <Upload className="h-12 w-12 text-gray-400 mb-4" />
            )}
            <p className="text-gray-600 mb-2">
              {!selectedInsurer || !selectedInsuranceType
                ? 'Selecione a seguradora e o tipo de seguro primeiro'
                : isDragActive
                  ? 'Solte o arquivo aqui'
                  : 'Arraste e solte o PDF da apólice aqui, ou clique para selecionar'}
            </p>
            <p className="text-sm text-gray-500">
              Apenas arquivos PDF são aceitos
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadPolicy;