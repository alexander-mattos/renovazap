
import React from 'react';
import { Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Policy } from '../types';

interface ExpiringPoliciesProps {
    expiringPolicies: Policy[];
}
const ExpiringPolicies: React.FC<ExpiringPoliciesProps> = ({ expiringPolicies }) => {
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    };

    const getDaysUntilExpiry = (dateString: string) => {
        const today = new Date();
        const expiryDate = new Date(dateString);
        const timeDiff = expiryDate.getTime() - today.getTime();
        return Math.ceil(timeDiff / (1000 * 3600 * 24));
    };

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Clock size={20} className="mr-2 text-amber-600" />
                    Apólices com Vencimento Próximo
                </h2>
            </div>

            <div className="overflow-x-auto">
                {expiringPolicies.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col\" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Segurado
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Nº da Apólice
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tipo
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Seguradora
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Vencimento
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Dias Restantes
                                </th>
                                <th scope="col" className="relative px-6 py-3">
                                    <span className="sr-only">Ações</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {expiringPolicies.map((policy) => {
                                const daysLeft = getDaysUntilExpiry(policy.endDate);

                                return (
                                    <tr key={policy.id}>
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
                                            <div className="text-sm text-gray-900">{formatDate(policy.endDate)}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${daysLeft <= 3 ? 'bg-red-100 text-red-800' :
                                                    daysLeft <= 7 ? 'bg-amber-100 text-amber-800' :
                                                        'bg-yellow-100 text-yellow-800'}`}>
                                                {daysLeft} dias
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
                    <div className="text-center py-6">
                        <p className="text-gray-500">Nenhuma apólice com vencimento nos próximos 10 dias.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default ExpiringPolicies