import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Search, 
  Filter, 
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import api from '../services/api';
import usePaginatedFetch from '../hooks/usePaginatedFetch';

interface Policy {
  id: string;
  policyNumber: string;
  policyholderName: string;
  startDate: string;
  endDate: string;
  premium: number;
  insuranceType: {
    id: string;
    name: string;
  };
  insuranceProvider: {
    id: string;
    name: string;
  };
}

interface FilterOptions {
  type: string;
  provider: string;
  status: string;
}

const Policies: React.FC = () => {
  // policies list handled by paginated hook
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    type: '',
    provider: '',
    status: ''
  });
  const [sortBy, setSortBy] = useState('policyholderName');
  const [sortDirection, setSortDirection] = useState('asc');
  
  // Pagination handled server-side
  const { items, total, page, pageSize, setParams, setPage, fetchPage, loading } = usePaginatedFetch<Policy>('/policies', undefined, 1, 10);

  // Insurance types and providers for filters
  const [insuranceTypes, setInsuranceTypes] = useState<{ id: string; name: string }[]>([]);
  const [insuranceProviders, setInsuranceProviders] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        // Fetch insurance types (for filters)
        const typesResponse = await api.get('/insurance-types');
        setInsuranceTypes(Array.isArray(typesResponse.data) ? typesResponse.data : typesResponse.data.items || []);
        // Fetch insurance providers (for filters)
        const providersResponse = await api.get('/insurance-providers');
        setInsuranceProviders(Array.isArray(providersResponse.data) ? providersResponse.data : providersResponse.data.items || []);
        // Fetch first page of policies via hook
        await fetchPage(1, 10, {} as any);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchMeta();
  }, []);

  useEffect(() => {
    // When filters/search/sorting change, update server query params
    const params: any = {};
    if (searchQuery) params.search = searchQuery;
    if (filters.type) params.type = filters.type;
    if (filters.provider) params.provider = filters.provider;
    if (filters.status) params.status = filters.status;
    if (sortBy) params.sortBy = sortBy;
    if (sortDirection) params.sortDir = sortDirection;

    setParams(params);
    setPage(1);
  }, [searchQuery, filters, sortBy, sortDirection]);

  const handleSort = (field: string) => {
    setSortDirection(sortBy === field && sortDirection === 'asc' ? 'desc' : 'asc');
    setSortBy(field);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const getPolicyStatus = (endDate: string) => {
    const today = new Date();
    const expiryDate = new Date(endDate);
    
    if (expiryDate < today) {
      return { label: 'Vencida', className: 'bg-red-100 text-red-800' };
    }
    
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 10) {
      return { label: 'A vencer', className: 'bg-amber-100 text-amber-800' };
    }
    
    return { label: 'Ativa', className: 'bg-green-100 text-green-800' };
  };

  // Pagination logic
  // Server-side pagination values
  const currentItems = (items || []) as Policy[];
  const totalPages = total ? Math.ceil(total / pageSize) : 0;
  const paginate = (pageNumber: number) => setPage(pageNumber);

  const clearFilters = () => {
    setFilters({
      type: '',
      provider: '',
      status: ''
    });
    setSearchQuery('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Apólices</h1>
        <Link
          to="/upload"
          aria-label="Nova Apólice"
          className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors"
        >
          <FileText size={16} className="mr-2" />
          Nova Apólice
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nome ou número da apólice..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Filter size={16} className="mr-2" />
            Filtros
          </button>
        </div>
        
        {showFilters && (
          <div className="p-4 bg-gray-50 border-b border-gray-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Seguro
              </label>
              <select
                id="type-filter"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              >
                <option value="">Todos os tipos</option>
                {insuranceTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="provider-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Seguradora
              </label>
              <select
                id="provider-filter"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={filters.provider}
                onChange={(e) => setFilters({ ...filters, provider: e.target.value })}
              >
                <option value="">Todas as seguradoras</option>
                {insuranceProviders.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status-filter"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">Todos os status</option>
                <option value="active">Ativas</option>
                <option value="expired">Vencidas</option>
                <option value="expiring">A vencer (10 dias)</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        )}
        
        <div className="overflow-x-auto">
          {currentItems.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('policyholderName')}
                  >
                    <div className="flex items-center">
                      Segurado
                      {sortBy === 'policyholderName' && (
                        <ArrowUpDown size={14} className="ml-1" />
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('policyNumber')}
                  >
                    <div className="flex items-center">
                      Nº da Apólice
                      {sortBy === 'policyNumber' && (
                        <ArrowUpDown size={14} className="ml-1" />
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('insuranceType')}
                  >
                    <div className="flex items-center">
                      Tipo
                      {sortBy === 'insuranceType' && (
                        <ArrowUpDown size={14} className="ml-1" />
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('insuranceProvider')}
                  >
                    <div className="flex items-center">
                      Seguradora
                      {sortBy === 'insuranceProvider' && (
                        <ArrowUpDown size={14} className="ml-1" />
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('premium')}
                  >
                    <div className="flex items-center">
                      Prêmio
                      {sortBy === 'premium' && (
                        <ArrowUpDown size={14} className="ml-1" />
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('endDate')}
                  >
                    <div className="flex items-center">
                      Vencimento
                      {sortBy === 'endDate' && (
                        <ArrowUpDown size={14} className="ml-1" />
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.map((policy) => {
                  const status = getPolicyStatus(policy.endDate);
                  
                  return (
                    <tr key={policy.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{policy.policyholderName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{policy.policyNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{policy.insuranceType.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{policy.insuranceProvider.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatCurrency(policy.premium)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(policy.endDate)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link 
                          to={`/policies/${policy.id}`} 
                          className="text-blue-700 hover:text-blue-900"
                        >
                          Detalhes
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">Nenhuma apólice encontrada.</p>
              <p className="text-gray-400 text-sm">Tente ajustar os filtros ou buscar por outro termo.</p>
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {total && total > 0 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{(page - 1) * pageSize + 1}</span> a{' '}
                  <span className="font-medium">{Math.min(page * pageSize, total)}</span> de <span className="font-medium">{total}</span> resultados
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => paginate(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                      page === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Anterior</span>
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => paginate(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === pageNum
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => paginate(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                      page === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="sr-only">Próxima</span>
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>

            {/* Mobile pagination */}
            <div className="flex items-center justify-between w-full sm:hidden">
              <button
                onClick={() => paginate(Math.max(1, page - 1))}
                disabled={page === 1}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  page === 1 ? 'text-gray-300 bg-gray-100' : 'text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                Anterior
              </button>
              <span className="text-sm text-gray-700">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => paginate(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  page === totalPages ? 'text-gray-300 bg-gray-100' : 'text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Policies;