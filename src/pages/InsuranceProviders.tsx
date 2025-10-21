import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, Loader2, X } from 'lucide-react';
import api from '../services/api';
import { InsuranceProvider, FormData } from '../types';
import usePaginatedFetch from '../hooks/usePaginatedFetch';

const InsuranceProviders: React.FC = () => {
  const { items: providers, total, page, pageSize, setPage, setPageSize, loading, fetchPage } = usePaginatedFetch<InsuranceProvider>('/insurance-providers', undefined, 1, 8);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<InsuranceProvider | null>(null);
  const [formData, setFormData] = useState<FormData>({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // initial load handled by hook; mirror loading state for compatibility
    setIsLoading(loading);
  }, [loading]);

  const handleOpenModal = (provider?: InsuranceProvider) => {
    if (provider) {
      setEditingProvider(provider);
      setFormData({
        name: provider.name,
        description: provider.description || ''
      });
    } else {
      setEditingProvider(null);
      setFormData({ name: '', description: '' });
    }
    setError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProvider(null);
    setFormData({ name: '', description: '' });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Nome é obrigatório');
      return;
    }

    try {
      setIsSubmitting(true);

      if (editingProvider) {
        await api.put(`/insurance-providers/${editingProvider.id}`, formData);
      } else {
        await api.post('/insurance-providers', formData);
      }

      await fetchPage();
      handleCloseModal();
    } catch (error: any) {
      console.error('Erro ao salvar seguradora:', error);
      setError(error.response?.data?.error || 'Erro ao salvar seguradora');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta seguradora?')) {
      return;
    }

    try {
  await api.delete(`/insurance-providers/${id}`);
  await fetchPage();
    } catch (error: any) {
      console.error('Erro ao excluir seguradora:', error);
      alert(error.response?.data?.error || 'Erro ao excluir seguradora');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Seguradoras</h1>
          <p className="text-gray-600 mt-1">Gerencie as seguradoras do sistema</p>
        </div>
        <div>
          <button
            onClick={() => handleOpenModal()}
            className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors"
          >
            <Plus size={16} className="mr-2" />
            Nova Seguradora
          </button>
        </div>
      </div>

      {error && !isModalOpen && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {providers.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descrição
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Apólices
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Criado em
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {providers.map((provider) => (
                <tr key={provider.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Building2 size={20} className="text-gray-400 mr-3" />
                      <div className="text-sm font-medium text-gray-900">{provider.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {provider.description || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {provider._count?.policies || 0} apólices
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{formatDate(provider.createdAt)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleOpenModal(provider)}
                      className="text-blue-700 hover:text-blue-900 mr-4"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(provider.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Excluir"
                      disabled={!!provider._count?.policies && provider._count.policies > 0}
                    >
                      <Trash2 size={16} className={provider._count?.policies && provider._count.policies > 0 ? 'opacity-50' : ''} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12">
            <Building2 size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Nenhuma seguradora cadastrada</p>
            <button
              onClick={() => handleOpenModal()}
              className="mt-4 text-blue-700 hover:text-blue-800 font-medium"
            >
              Adicionar primeira seguradora
            </button>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {total !== null && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">Total: {total}</div>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => { const np = Math.max(1, page-1); setPage(np); fetchPage(np, pageSize); }} className="px-3 py-1 border rounded disabled:opacity-50">Anterior</button>
            <div>Página {page}</div>
            <button disabled={total !== null && page * pageSize >= total} onClick={() => { const np = page+1; setPage(np); fetchPage(np, pageSize); }} className="px-3 py-1 border rounded disabled:opacity-50">Próxima</button>
            <select value={pageSize} onChange={(e) => { const s = parseInt(e.target.value, 10); setPageSize(s); setPage(1); fetchPage(1, s); }} className="ml-4 border rounded px-2 py-1">
              <option value={8}>8</option>
              <option value={16}>16</option>
              <option value={32}>32</option>
            </select>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingProvider ? 'Editar Seguradora' : 'Nova Seguradora'}
              </h2>
              <button
                title="Fechar"
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: Porto Seguro"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Descrição opcional da seguradora"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  title="Cancelar"
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  title={editingProvider ? 'Salvar' : 'Adicionar'}
                  className="px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingProvider ? 'Salvar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InsuranceProviders;