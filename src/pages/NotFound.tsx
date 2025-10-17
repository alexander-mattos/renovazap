import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, Home } from 'lucide-react';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
      <div className="text-center">
        <div className="mx-auto h-24 w-24 rounded-full bg-red-100 flex items-center justify-center">
          <FileQuestion className="h-12 w-12 text-red-600" />
        </div>
        <h1 className="mt-6 text-4xl font-extrabold text-gray-900">Página não encontrada</h1>
        <p className="mt-3 text-lg text-gray-600">
          A página que você está procurando não existe ou foi removida.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Home className="h-5 w-5 mr-2" />
            Voltar para o Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;