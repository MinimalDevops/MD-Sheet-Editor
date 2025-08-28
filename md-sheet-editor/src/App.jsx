import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { validateN8NDomainConfig, logEnvironmentConfig } from './utils/envValidation';
import EnvError from './components/EnvError';

// Utility: check if a string is a URL
const isUrl = (str) => {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const PAGE_SIZE = 20; // For pagination
const TRUNCATE_LENGTH = 60; // Number of chars to show in table cell

// Environment configuration with validation
const N8N_PORT = process.env.REACT_APP_N8N_PORT || "5678";
const N8N_FETCH_WEBHOOK = process.env.REACT_APP_N8N_FETCH_WEBHOOK || "Fetch-Rows-Multi";
const N8N_UPDATE_WEBHOOK = process.env.REACT_APP_N8N_UPDATE_WEBHOOK || "Update-Row-Multi";
const N8N_DELETE_WEBHOOK = process.env.REACT_APP_N8N_DELETE_WEBHOOK || "Delete-Row";



// Build URLs from validated components
const buildWebhookUrl = (domain, webhookName, isLocalhost = false) => {
  const protocol = isLocalhost ? "http" : "https";
  const port = isLocalhost ? `:${N8N_PORT}` : "";
  return `${protocol}://${domain}${port}/webhook/${webhookName}`;
};

// Build endpoint arrays from validated domains
const buildEndpointUrls = (webhookName) => {
  const validation = validateN8NDomainConfig();
  const urls = [];
  
  if (validation.localhost) {
    urls.push(buildWebhookUrl(validation.localhost, webhookName, true));
  }
  
  if (validation.customDomain) {
    urls.push(buildWebhookUrl(validation.customDomain, webhookName, false));
  }
  
  return urls;
};

const FETCH_URLS = buildEndpointUrls(N8N_FETCH_WEBHOOK);
const UPDATE_URLS = buildEndpointUrls(N8N_UPDATE_WEBHOOK);
const DELETE_URLS = buildEndpointUrls(N8N_DELETE_WEBHOOK);

// Log environment configuration for debugging
logEnvironmentConfig();

// Document and sheet configuration from .env
// Format: "doc_name:sheet1[matchCol1],sheet2[matchCol2];doc_name2:sheet3[matchCol3]"
const parseDocSheetConfig = () => {
  const config = process.env.REACT_APP_DOC_SHEET_CONFIG || "";
  const result = {};
  
  if (!config.trim()) return result;
  
  const docConfigs = config.split(';').filter(Boolean);
  
  docConfigs.forEach(docConfig => {
    const [docName, sheets] = docConfig.split(':');
    if (docName && sheets) {
      // Extract sheet names by removing matching column info [matchCol]
      result[docName.trim()] = sheets.split(',').map(s => s.trim().replace(/\[.*\]/, '')).filter(Boolean);
    }
  });
  
  return result;
};

const DOC_SHEET_CONFIG = parseDocSheetConfig();

// Debug logging
console.log('DOC_SHEET_CONFIG:', DOC_SHEET_CONFIG);
console.log('REACT_APP_DOC_SHEET_CONFIG:', process.env.REACT_APP_DOC_SHEET_CONFIG);

async function tryEndpoints(urls, fn, opType = "") {
  let lastError;
  for (const url of urls) {
    console.log(`[${opType}] Trying endpoint:`, url);
    try {
      return await fn(url);
    } catch (e) {
      lastError = e;
      console.error(`[${opType}] Error with endpoint:`, url, e);
    }
  }
  lastError._allTriedEndpoints = urls;
  return Promise.reject(lastError);
}

function App() {
  // Environment validation
  const envValidation = validateN8NDomainConfig();
  const envError = envValidation.isValid ? null : envValidation.error;

  const [selectedDoc, setSelectedDoc] = useState(() => {
    // Initialize from localStorage if available
    const savedDoc = localStorage.getItem('selectedDoc');
    const savedSheet = localStorage.getItem('selectedSheet');
    
    // If we have a saved sheet but no saved doc, clear the invalid state
    if (savedSheet && !savedDoc) {
      localStorage.removeItem('selectedSheet');
      return null;
    }
    
    return savedDoc || null;
  });
  const [selectedSheet, setSelectedSheet] = useState(() => {
    // Initialize from localStorage if available
    const savedDoc = localStorage.getItem('selectedDoc');
    const savedSheet = localStorage.getItem('selectedSheet');
    
    // Only return saved sheet if we also have a saved doc
    if (savedDoc && savedSheet) {
      return savedSheet;
    }
    
    // Clear invalid state
    if (savedSheet && !savedDoc) {
      localStorage.removeItem('selectedSheet');
    }
    
    return null;
  });
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editRowIdx, setEditRowIdx] = useState(null);
  const [editRowData, setEditRowData] = useState({});
  const [editedRows, setEditedRows] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [page, setPage] = useState(0);
  const [showCellModal, setShowCellModal] = useState(false);
  const [cellModalContent, setCellModalContent] = useState("");
  const [cellModalTitle, setCellModalTitle] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    
    const searchLower = searchTerm.toLowerCase();
    return data.filter(row => {
      return Object.values(row).some(value => {
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(searchLower);
      });
    });
  }, [data, searchTerm]);

  // Reset page when search changes
  useEffect(() => {
    setPage(0);
  }, [searchTerm]);

  // Fetch data when a sheet is selected
  useEffect(() => {
    if (!selectedDoc || !selectedSheet) return;
    setLoading(true);
    setError("");
    setData([]);
    setPage(0);
    setSearchTerm(""); // Clear search when switching sheets
    tryEndpoints(
      FETCH_URLS,
      (url) => axios.post(url, { doc: selectedDoc, sheet: selectedSheet }),
      "FETCH"
    )
      .then((res) => {
        setData(res.data || []);
      })
      .catch((e) => {
        const tried = e._allTriedEndpoints || FETCH_URLS;
        setError(
          `Failed to fetch data from all endpoints.\nTried:\n${tried.join("\n")}`
        );
      })
      .finally(() => setLoading(false));
  }, [selectedDoc, selectedSheet]);

  // Document selection page
  if (!selectedDoc) {
    return (
      <div className="min-h-screen bg-black text-gray-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full max-h-[90vh] bg-gray-900 rounded-lg shadow flex flex-col">
          <div className="p-8 pb-4">
            <div className="flex items-center justify-center mb-6">
              <img 
                src="https://pubfol.tapindersingh.click/MinimalDevopsLogo.png" 
                alt="MD Sheet Editor Logo" 
                className="h-12 w-auto"
              />
            </div>
            <h1 className="text-2xl font-bold mb-6 text-white text-center">Select a Document</h1>
          </div>
          <div className="flex-1 overflow-y-auto px-8 pb-8">
            <div className="flex flex-col gap-4">
              {Object.keys(DOC_SHEET_CONFIG).length === 0 && (
                <div className="text-red-400 text-center">
                  No document configuration found in .env
                  <br />
                  <button 
                    onClick={() => {
                      localStorage.clear();
                      window.location.reload();
                    }}
                    className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Clear Cache & Reload
                  </button>
                </div>
              )}
              {Object.keys(DOC_SHEET_CONFIG).map((docName) => (
                <button
                  key={docName}
                  className="w-full py-3 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg transition"
                  onClick={() => {
                    setSelectedDoc(docName);
                    // Save to localStorage
                    localStorage.setItem('selectedDoc', docName);
                    // Clear any previously selected sheet
                    setSelectedSheet(null);
                    localStorage.removeItem('selectedSheet');
                  }}
                >
                  {docName}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sheet selection page
  if (!selectedSheet) {
    return (
      <div className="min-h-screen bg-black text-gray-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full max-h-[90vh] bg-gray-900 rounded-lg shadow flex flex-col">
          <div className="p-8 pb-4">
            <div className="flex items-center justify-center mb-6">
              <img 
                src="https://pubfol.tapindersingh.click/MinimalDevopsLogo.png" 
                alt="MD Sheet Editor Logo" 
                className="h-12 w-auto"
              />
            </div>
            <h1 className="text-2xl font-bold mb-6 text-white text-center">Select a Sheet</h1>
            <div className="mb-4 text-lg font-semibold text-blue-300 text-center">Document: {selectedDoc}</div>
          </div>
          <div className="flex-1 overflow-y-auto px-8 pb-4">
            <div className="flex flex-col gap-4">
              {DOC_SHEET_CONFIG[selectedDoc]?.length === 0 && (
                <div className="text-red-400 text-center">No sheets found for this document</div>
              )}
              {DOC_SHEET_CONFIG[selectedDoc]?.map((sheetName) => (
                <button
                  key={sheetName}
                  className="w-full py-3 rounded bg-green-600 hover:bg-green-700 text-white font-semibold text-lg transition"
                  onClick={() => {
                    setSelectedSheet(sheetName);
                    // Save to localStorage
                    localStorage.setItem('selectedSheet', sheetName);
                  }}
                >
                  {sheetName}
                </button>
              ))}
            </div>
          </div>
          <div className="p-8 pt-4">
            <button
              className="w-full py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold transition"
              onClick={() => {
                setSelectedDoc(null);
                localStorage.removeItem('selectedDoc');
              }}
            >
              ← Back to Document Selection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Table view
  return (
    <div className="min-h-screen bg-black text-gray-100 p-4 font-sans">
      <EnvError error={envError} />
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
          <div className="flex items-center space-x-4">
            <img 
              src="https://pubfol.tapindersingh.click/MinimalDevopsLogo.png" 
              alt="MD Sheet Editor Logo" 
              className="h-12 w-auto"
            />
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">Sheet Editor</h1>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              className="bg-gray-800 text-gray-200 px-4 py-2 rounded hover:bg-gray-700 border border-gray-700 font-semibold text-sm lg:text-base"
              onClick={() => {
                setSelectedSheet(null);
                // Clear sheet from localStorage but keep document
                localStorage.removeItem('selectedSheet');
                setData([]);
                setError("");
                setPage(0);
              }}
            >
              &larr; Back to Sheet Selection
            </button>
            <button
              className="bg-gray-800 text-gray-200 px-4 py-2 rounded hover:bg-gray-700 border border-gray-700 font-semibold text-sm lg:text-base"
              onClick={() => {
                setSelectedDoc(null);
                setSelectedSheet(null);
                // Clear from localStorage
                localStorage.removeItem('selectedDoc');
                localStorage.removeItem('selectedSheet');
                setData([]);
                setError("");
                setPage(0);
              }}
            >
              &larr; Back to Document Selection
            </button>
          </div>
        </div>
        <div className="mb-4 text-sm lg:text-lg font-semibold text-blue-300 break-words">
          <span className="block sm:inline">Document: {selectedDoc}</span>
          <span className="hidden sm:inline"> | </span>
          <span className="block sm:inline">Sheet: {selectedSheet}</span>
        </div>
        
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search across all columns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 lg:px-4 py-2 lg:py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm lg:text-base"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
              >
                ×
              </button>
            )}
          </div>
          {searchTerm && (
            <div className="mt-2 text-sm text-gray-400">
              Found {filteredData.length} of {data.length} rows
            </div>
          )}
        </div>

        {loading && (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        )}
        {error && (
          <div className="text-center py-8 text-red-400 whitespace-pre-line">{error}</div>
        )}
        {!loading && !error && filteredData.length > 0 && (
          <>
            {/* Table */}
            <div className="overflow-x-auto rounded-lg shadow bg-gray-900 relative">
              <table className="min-w-full text-xs lg:text-sm border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-gray-800">
                  <tr>
                    {Object.keys(filteredData[0] || {}).map((col) => (
                                              <th
                          key={col}
                          className="px-2 lg:px-4 py-2 lg:py-3 text-left font-semibold border-b border-gray-800 whitespace-nowrap text-gray-300 uppercase tracking-wide text-xs"
                        >
                        {col}
                      </th>
                    ))}
                    <th className="px-4 py-3 border-b border-gray-800 sticky right-0 bg-gray-800 z-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData
                    .slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
                    .map((row, idx) => {
                      const globalIdx = page * PAGE_SIZE + idx;
                      const rowKey = row.row_number !== undefined ? row.row_number : globalIdx;
                      const isEdited = !!editedRows[rowKey];
                      return (
                        <tr
                          key={rowKey}
                          className={
                            isEdited
                              ? "bg-gray-800 hover:bg-gray-700"
                              : globalIdx % 2
                              ? "bg-gray-900 hover:bg-gray-800"
                              : "hover:bg-gray-900"
                          }
                        >
                          {Object.keys(row).map((col) => (
                                                      <td
                            key={col}
                            className={`px-2 lg:px-4 py-2 lg:py-3 align-top border-b border-gray-800 max-w-xs truncate text-gray-100 ${
                              !isUrl(row[col]) && typeof row[col] === "string" && row[col].length > TRUNCATE_LENGTH ? "cursor-pointer hover:underline" : ""
                            }`}
                              title={typeof row[col] === "string" && row[col].length > TRUNCATE_LENGTH ? row[col] : undefined}
                              onClick={() => {
                                if (!isUrl(row[col]) && typeof row[col] === "string" && row[col].length > TRUNCATE_LENGTH) {
                                  setCellModalTitle(col);
                                  setCellModalContent(row[col]);
                                  setShowCellModal(true);
                                }
                              }}
                            >
                              {isUrl(row[col]) ? (
                                <a
                                  href={row[col]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 underline break-all hover:text-blue-300"
                                >
                                  {row[col]}
                                </a>
                              ) : typeof row[col] === "string" && row[col].length > TRUNCATE_LENGTH ? (
                                <div className="whitespace-pre-line">
                                  {row[col].slice(0, TRUNCATE_LENGTH) + "..."}
                                </div>
                              ) : typeof row[col] === "string" ? (
                                <div className="whitespace-pre-line">
                                  {row[col]}
                                </div>
                              ) : (
                                row[col]
                              )}
                            </td>
                          ))}
                          <td className={`px-2 lg:px-4 py-2 lg:py-3 border-b border-gray-800 sticky right-0 z-20 ${
                            isEdited
                              ? "bg-gray-800"
                              : globalIdx % 2
                              ? "bg-gray-900"
                              : "bg-gray-900"
                          }`}>
                            <button
                              className="text-blue-400 hover:text-blue-200 font-medium focus:outline-none"
                              onClick={() => {
                                setEditRowIdx(rowKey);
                                setEditRowData({ ...row });
                                setSaveError("");
                              }}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {filteredData.length > PAGE_SIZE && (() => {
              const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);
              const currentPage = page + 1;
              let startPage = Math.max(1, currentPage - 2);
              let endPage = Math.min(totalPages, currentPage + 2);
              if (currentPage <= 3) {
                endPage = Math.min(totalPages, 5);
              }
              if (currentPage >= totalPages - 2) {
                startPage = Math.max(1, totalPages - 4);
              }
              const pages = [];
              if (startPage > 1) {
                pages.push(1);
                if (startPage > 2) pages.push('...');
              }
              for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
              }
              if (endPage < totalPages) {
                if (endPage < totalPages - 1) pages.push('...');
                pages.push(totalPages);
              }
              return (
                <div className="flex justify-center items-center mt-6 space-x-1 lg:space-x-2">
                  <button
                    className="px-2 lg:px-3 py-2 border border-gray-700 rounded disabled:opacity-50 bg-gray-900 text-gray-200 shadow-sm hover:bg-gray-800 transition-colors text-sm lg:text-base"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    Previous
                  </button>
                  <div className="flex space-x-1">
                    {pages.map((pageNum, idx) => (
                      <button
                        key={idx}
                        className={`px-2 lg:px-3 py-2 border rounded transition-colors text-sm lg:text-base ${
                          pageNum === '...'
                            ? 'border-gray-700 bg-gray-900 text-gray-500 cursor-default'
                            : pageNum === currentPage
                            ? 'border-blue-500 bg-blue-600 text-white'
                            : 'border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800'
                        }`}
                        onClick={() => {
                          if (pageNum !== '...') {
                            setPage(pageNum - 1);
                          }
                        }}
                        disabled={pageNum === '...'}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>
                  <button
                    className="px-2 lg:px-3 py-2 border border-gray-700 rounded disabled:opacity-50 bg-gray-900 text-gray-200 shadow-sm hover:bg-gray-800 transition-colors text-sm lg:text-base"
                    onClick={() =>
                      setPage((p) =>
                        Math.min(
                          Math.floor((filteredData.length - 1) / PAGE_SIZE),
                          p + 1
                        )
                      )
                    }
                    disabled={page >= Math.floor((filteredData.length - 1) / PAGE_SIZE)}
                  >
                    Next
                  </button>
                </div>
              );
            })()}
          </>
        )}
        {!loading && !error && filteredData.length === 0 && data.length > 0 && (
          <div className="text-center py-8 text-gray-400">
            No results found for "{searchTerm}"
          </div>
        )}
      </div>
      {/* Modal for viewing full cell content */}
      {showCellModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
          <div className="bg-gray-900 rounded shadow-lg w-full max-w-xl p-6 relative animate-fadeIn max-h-[80vh] flex flex-col border border-gray-700">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-200 text-2xl font-bold"
              onClick={() => setShowCellModal(false)}
              aria-label="Close"
            >
              ×
            </button>
            <h3 className="text-lg font-semibold mb-2 text-gray-100">{cellModalTitle}</h3>
            <div className="overflow-y-auto text-gray-200 whitespace-pre-line font-mono text-sm" style={{maxHeight: '60vh'}}>
              {cellModalContent}
            </div>
          </div>
        </div>
      )}
      {/* Modal for editing row */}
      {editRowIdx !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4">
                  <div className="bg-gray-900 rounded shadow-lg w-full max-w-4xl h-[95vh] flex flex-col relative animate-fadeIn border border-gray-700">
                      <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-700 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-100">Edit Row {editRowData.row_number ? `#${editRowData.row_number}` : ""}</h2>
              <button
                className="text-gray-400 hover:text-gray-200 text-2xl font-bold"
                onClick={() => setEditRowIdx(null)}
                aria-label="Close"
                disabled={saving || deleting}
                title="Close edit modal"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 pt-4 modal-scroll smooth-scroll">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
              >
              {Object.keys(editRowData).map((col) => (
                <div className="mb-3" key={col}>
                  <label className="block font-medium mb-1 text-gray-300">{col}</label>
                  {col === "row_number" ? (
                    <input
                      className="w-full border border-gray-700 bg-gray-800 text-gray-100 rounded px-2 py-2 focus:outline-none focus:ring focus:border-blue-500"
                      type="text"
                      value={editRowData[col] || ""}
                      disabled={saving}
                    />
                  ) : (
                    <textarea
                      className="w-full border border-gray-700 bg-gray-800 text-gray-100 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all duration-200"
                      rows={2}
                      value={editRowData[col] || ""}
                      onChange={(e) => handleEditChange(col, e.target.value)}
                      disabled={saving}
                      onFocus={(e) => {
                        // Expand textarea on focus for better editing
                        e.target.style.height = 'auto';
                        const newHeight = Math.max(100, Math.min(300, e.target.scrollHeight));
                        e.target.style.height = newHeight + 'px';
                      }}
                      onBlur={(e) => {
                        // Collapse to minimum size when not focused unless it has content that needs more space
                        e.target.style.height = 'auto';
                        const contentHeight = Math.max(60, Math.min(120, e.target.scrollHeight));
                        e.target.style.height = contentHeight + 'px';
                      }}
                      onInput={(e) => {
                        // Auto-resize as user types
                        e.target.style.height = 'auto';
                        const newHeight = Math.max(60, Math.min(300, e.target.scrollHeight));
                        e.target.style.height = newHeight + 'px';
                      }}
                      style={{
                        minHeight: '60px',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#4B5563 #1F2937'
                      }}
                      placeholder={`Enter ${col.toLowerCase()}...`}
                    />
                  )}
                </div>
              ))}
                {saveError && (
                  <div className="text-red-400 mb-2">{saveError}</div>
                )}
                {deleteError && (
                  <div className="text-red-400 mb-2">{deleteError}</div>
                )}
              </form>
            </div>
            <div className="p-6 pt-4 border-t border-gray-700 bg-gray-800 flex-shrink-0">
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 bg-blue-600 text-white py-2 rounded font-semibold disabled:opacity-50 hover:bg-blue-700 transition"
                  disabled={saving || deleting}
                  onClick={handleSave}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  className="bg-red-600 text-white py-2 px-4 rounded font-semibold disabled:opacity-50 hover:bg-red-700 transition"
                  disabled={saving || deleting}
                  onClick={handleDelete}
                  title="Delete this row permanently"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
                <button
                  type="button"
                  className="flex-1 bg-gray-700 text-gray-200 py-2 rounded font-semibold border border-gray-600 hover:bg-gray-600"
                  onClick={() => setEditRowIdx(null)}
                  disabled={saving || deleting}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function handleEditChange(col, val) {
    setEditRowData((prev) => ({ ...prev, [col]: val }));
  }

  async function handleDelete() {
    console.log('=== DELETE BUTTON CLICKED ===');
    console.log('Edit Row Data:', editRowData);
    console.log('Selected Doc:', selectedDoc);
    console.log('Selected Sheet:', selectedSheet);
    
    if (!window.confirm('Are you sure you want to delete this row? This action cannot be undone.')) {
      console.log('Delete cancelled by user');
      return;
    }

    setDeleting(true);
    setDeleteError("");
    try {
      const rowNumber = editRowData.row_number !== undefined ? editRowData.row_number : editRowIdx;
      
      // Create request body for delete operation
      const requestBody = {
        doc: selectedDoc,
        sheet: selectedSheet,
        row_number: rowNumber
      };
      
      // Debug logging
      console.log('=== DELETE WEBHOOK DEBUG ===');
      console.log('DELETE_URLS:', DELETE_URLS);
      console.log('Request Body:', requestBody);
      console.log('Row Number:', rowNumber);
      console.log('===========================');
      
      const response = await tryEndpoints(
        DELETE_URLS,
        (url) => axios.post(url, requestBody),
        "DELETE"
      );
      
      console.log('=== DELETE WEBHOOK RESPONSE ===');
      console.log('Response:', response);
      console.log('Response Status:', response?.status);
      console.log('Response Data:', response?.data);
      console.log('=============================');
      
      // Remove the row from local data
      setData((prev) => prev.filter((row) => 
        (row.row_number !== undefined ? row.row_number : row) !== rowNumber
      ));
      
      // Close the edit modal
      setEditRowIdx(null);
      
    } catch (e) {
      const tried = e._allTriedEndpoints || DELETE_URLS;
      console.error("Delete error:", e);
      setDeleteError(
        `Failed to delete row.\nTried endpoints:\n${tried.join("\n")}\n` +
          (e.response && e.response.data
            ? typeof e.response.data === "string"
              ? e.response.data
              : JSON.stringify(e.response.data)
            : e.message || "")
      );
    } finally {
      setDeleting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    try {
      const rowIndex = editRowData.row_number !== undefined ? editRowData.row_number : editRowIdx;
      
      // Create request body with column names as root-level keys
      const requestBody = {
        doc: selectedDoc,
        sheet: selectedSheet,
        rowIndex: rowIndex
      };
      
      // Add each column as a root-level key, excluding ROW_NUMBER
      Object.keys(editRowData).forEach(col => {
        if (col !== 'ROW_NUMBER' && col !== 'row_number') {
          requestBody[col] = editRowData[col] ?? "";
        }
      });
      
      // Debug logging
      console.log('=== UPDATE WEBHOOK DEBUG ===');
      console.log('UPDATE_URLS:', UPDATE_URLS);
      console.log('Request Body:', requestBody);
      console.log('Request Body JSON:', JSON.stringify(requestBody, null, 2));
      console.log('Selected Doc:', selectedDoc);
      console.log('Selected Sheet:', selectedSheet);
      console.log('Row Index:', rowIndex);
      console.log('Edit Row Data:', editRowData);
      console.log('===========================');
      
      const response = await tryEndpoints(
        UPDATE_URLS,
        (url) => axios.post(url, requestBody),
        "UPDATE"
      );
      
      console.log('=== UPDATE WEBHOOK RESPONSE ===');
      console.log('Response:', response);
      console.log('Response Status:', response?.status);
      console.log('Response Data:', response?.data);
      console.log('=============================');
      setData((prev) =>
        prev.map((row) =>
          (row.row_number !== undefined ? row.row_number : row) === rowIndex
            ? { ...editRowData }
            : row
        )
      );
      setEditedRows((prev) => ({ ...prev, [rowIndex]: true }));
      setEditRowIdx(null);
    } catch (e) {
      const tried = e._allTriedEndpoints || UPDATE_URLS;
      console.error("Save error:", e);
      setSaveError(
        `Failed to save changes.\nTried endpoints:\n${tried.join("\n")}\n` +
          (e.response && e.response.data
            ? typeof e.response.data === "string"
              ? e.response.data
              : JSON.stringify(e.response.data)
            : e.message || "")
      );
    } finally {
      setSaving(false);
    }
  }
}

export default App; 