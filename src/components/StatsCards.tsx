
import React from 'react';
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle, FileText, MessageSquare, TrendingUp } from "lucide-react";
import { Stats } from '../types';

interface StatsCardsProps {
    stats: Stats;
}
const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-600">Total de Apólices</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalPolicies}</p>
                    </div>
                    <div className="bg-blue-100 p-3 rounded-full">
                        <FileText size={20} className="text-blue-700" />
                    </div>
                </div>
                <div className="mt-4">
                    <Link to="/policies" className="text-sm text-blue-700 hover:text-blue-800">
                        Ver todas →
                    </Link>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-600">Apólices a Vencer (10 dias)</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{stats.expiringPolicies}</p>
                    </div>
                    <div className="bg-amber-100 p-3 rounded-full">
                        <AlertTriangle size={20} className="text-amber-700" />
                    </div>
                </div>
                <div className="mt-4">
                    <Link to="/policies" className="text-sm text-blue-700 hover:text-blue-800">
                        Ver detalhes →
                    </Link>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-600">Notificações Ativas</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{stats.activeNotifications}</p>
                    </div>
                    <div className="bg-green-100 p-3 rounded-full">
                        <MessageSquare size={20} className="text-green-700" />
                    </div>
                </div>
                <div className="mt-4">
                    <Link to="/notifications" className="text-sm text-blue-700 hover:text-blue-800">
                        Gerenciar →
                    </Link>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-600">Taxa de Renovação</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{stats.renewalRate}%</p>
                    </div>
                    <div className="bg-teal-100 p-3 rounded-full">
                        <TrendingUp size={20} className="text-teal-700" />
                    </div>
                </div>
                    <div className="mt-4 flex items-center text-sm">
                        {stats.renewalRate >= 70 ? (
                            <div className="flex items-center text-sm text-green-700">
                                <CheckCircle size={16} className="mr-1" />
                                <span>Acima da meta ({70}%)</span>
                            </div>
                        ) : (
                            <div className="flex items-center text-sm text-red-600">
                                <AlertTriangle size={16} className="mr-1" />
                                <span>Abaixo da meta ({70}%)</span>
                            </div>
                        )}
                    </div>
            </div>
        </div>
    );
}

export default StatsCards;