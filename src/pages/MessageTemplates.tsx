

import React, { useEffect, useState } from 'react';
import { Edit2, Loader2, Plus, Tag, Trash2, X } from 'lucide-react';
import { MessageTemplate } from '../types';
import api from '../services/api';

const MessageTemplates: React.FC = () => {
  const [editingMessageTemplate, setEditingMessageTemplate] = useState<MessageTemplate | null>(null);
  const [formData, setFormData] = useState({ name: '', content: '', daysBeforeExpiry: 0 });
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/message-templates');
      setTemplates(response.data);
    } catch (error) {
      console.error('Erro ao buscar modelos de mensagens:', error);
      setError('Erro ao buscar modelos de mensagens');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (type?: MessageTemplate) => {
    if (type) {
      setEditingMessageTemplate(type);
      setFormData({
        name: type.name,
        content: type.content,
        daysBeforeExpiry: type.daysBeforeExpiry
      });
    } else {
      setEditingMessageTemplate(null);
      setFormData({ name: '', content: '', daysBeforeExpiry: 0 });
    }
    setError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMessageTemplate(null);
    setFormData({ name: '', content: '', daysBeforeExpiry: 0 });
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

      if (editingMessageTemplate) {
        await api.put(`/message-templates/${editingMessageTemplate.id}`, formData);
      } else {
        await api.post('/message-templates', formData);
      }

      await fetchTemplates();
      handleCloseModal();
    } catch (error: any) {
      console.error('Erro ao salvar modelo de mensagem:', error);
      setError('Erro ao salvar modelo de mensagem');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este modelo de mensagem?')) {
      return;
    }

    try {
      await api.delete(`/message-templates/${id}`);
      await fetchTemplates();
    } catch (error: any) {
      console.error('Erro ao excluir modelo de mensagem:', error);
      alert('Erro ao excluir modelo de mensagem');
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
          <h1 className="text-2xl font-bold text-gray-900">Modelos de Mensagens</h1>
          <p className="text-gray-600 mt-1">Gerencie os modelos de mensagens disponíveis</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          type="button"
          className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors"
        >
          <Plus size={16} className="mr-2" />
          Novo Modelo
        </button>
      </div>

      {error && !isModalOpen && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {templates.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conteúdo
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dias antes de expirar
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
              {templates.map((template) => (
                <tr key={template.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Tag size={20} className="text-gray-400 mr-3" />
                      <div className="text-sm font-medium text-gray-900">{template.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {template.content || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {template.daysBeforeExpiry || 0} dias
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{formatDate(template.createdAt)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleOpenModal(template)}
                      type="button"
                      className="text-blue-700 hover:text-blue-900 mr-4"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      type="button"
                      className="text-red-600 hover:text-red-900"
                      title="Excluir"
                      disabled={false}
                    >
                      <Trash2 size={16} className={template ? 'opacity-50' : ''} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12">
            <Tag size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Nenhum modelo de mensagem cadastrado</p>
            <button
              onClick={() => handleOpenModal()}
              type="button"
              className="mt-4 text-blue-700 hover:text-blue-800 font-medium"
            >
              Adicionar primeiro modelo
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingMessageTemplate ? 'Editar Modelo de Mensagem' : 'Novo Modelo de Mensagem'}
              </h2>
              <button
                type="button"
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
                    placeholder="Ex: Mensagem para o cliente"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Conteúdo
                  </label>
                  <textarea
                    id="description"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-3 py-2 border h-40 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    placeholder="Conteúdo do modelo de mensagem"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label htmlFor="daysBeforeExpiry" className="block text-sm font-medium text-gray-700 mb-1">
                    Dias antes de expirar
                  </label>
                  <input
                    type="number"
                    id="daysBeforeExpiry"
                    value={formData.daysBeforeExpiry}
                    onChange={(e) => setFormData({ ...formData, daysBeforeExpiry: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingMessageTemplate ? 'Salvar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default MessageTemplates;