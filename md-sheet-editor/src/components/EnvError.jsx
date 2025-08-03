import React from 'react';

const EnvError = ({ error }) => {
  if (!error) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white p-4 shadow-lg">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold">Environment Configuration Error</span>
          </div>
        </div>
        <div className="mt-2 text-sm">
          <p>{error}</p>
          <p className="mt-1 opacity-90">
            Please check your <code className="bg-red-700 px-1 rounded">.env</code> file and ensure at least one of 
            <code className="bg-red-700 px-1 rounded">REACT_APP_N8N_LOCALHOST</code> or 
            <code className="bg-red-700 px-1 rounded">REACT_APP_N8N_CUSTOM_DOMAIN</code> is set.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EnvError; 