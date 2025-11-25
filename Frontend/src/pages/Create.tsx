/**
 * Create Page Component
 * 
 * Form to register new data schemas on Somnia Data Streams
 */

import React, { useState, useEffect } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { validateSchema, formatSchema, type SchemaValidationResult } from '../utils/schemaValidator';
import { SCHEMA_TEMPLATES, type SchemaTemplate } from '../utils/schemaTemplates';
import { initializeSomniaSDK, registerSchema, computeSchemaId } from '../utils/somniaSdk';
import { parseWalletError, logError } from '../utils/errorHandling';
import AppHeader from '../components/AppHeader';
import Alert from '../components/Alert';
import NetworkStatus from '../components/NetworkStatus';
import type { Hex } from 'viem';

const Create: React.FC = () => {
  const { isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();

  // Form state
  const [schemaName, setSchemaName] = useState('');
  const [schemaDefinition, setSchemaDefinition] = useState('');
  const [parentSchemaId, setParentSchemaId] = useState('');
  const [useParent, setUseParent] = useState(false);

  // UI state
  const [validation, setValidation] = useState<SchemaValidationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [computedSchemaId, setComputedSchemaId] = useState<string | null>(null);

  // Get unique categories
  const categories = ['All', ...Array.from(new Set(SCHEMA_TEMPLATES.map(t => t.category)))];

  // Filter templates
  const filteredTemplates = selectedCategory === 'All'
    ? SCHEMA_TEMPLATES
    : SCHEMA_TEMPLATES.filter(t => t.category === selectedCategory);

  // Validate schema on change
  useEffect(() => {
    if (schemaDefinition.trim()) {
      const result = validateSchema(schemaDefinition);
      setValidation(result);
    } else {
      setValidation(null);
    }
  }, [schemaDefinition]);

  // Compute schema ID on valid schema
  useEffect(() => {
    const compute = async () => {
      if (validation?.isValid && schemaDefinition.trim() && walletClient) {
        const sdk = await initializeSomniaSDK(walletClient);
        if (sdk) {
          const id = await computeSchemaId(sdk, schemaDefinition);
          if (id) {
            setComputedSchemaId(id);
          }
        }
      } else {
        setComputedSchemaId(null);
      }
    };
    compute();
  }, [validation, schemaDefinition, walletClient]);

  // Handle template selection
  const handleTemplateSelect = (template: SchemaTemplate) => {
    setSchemaName(template.name);
    setSchemaDefinition(template.schema);
    setShowTemplates(false);
  };

  // Handle schema formatting
  const handleFormatSchema = () => {
    if (schemaDefinition.trim()) {
      setSchemaDefinition(formatSchema(schemaDefinition));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !walletClient) {
      setError('Please connect your wallet first');
      return;
    }

    if (!validation?.isValid) {
      setError('Please fix schema validation errors');
      return;
    }

    if (!schemaName.trim()) {
      setError('Please enter a schema name');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Initialize SDK
      const sdk = await initializeSomniaSDK(walletClient);
      if (!sdk) {
        throw new Error('Failed to initialize Somnia SDK');
      }

      // Register schema
      const params = {
        schemaName: schemaName.trim(),
        schema: formatSchema(schemaDefinition),
        ...(useParent && parentSchemaId && { parentSchemaId: parentSchemaId as Hex }),
      };

      const result = await registerSchema(sdk, params);

      if (result.success) {
        setSuccess(`Schema registered successfully! Transaction: ${result.transactionHash}`);
        // Reset form
        setSchemaName('');
        setSchemaDefinition('');
        setParentSchemaId('');
        setUseParent(false);
        setValidation(null);
      } else {
        const errorDetails = parseWalletError(new Error(result.error || 'Registration failed'));
        setError(errorDetails.message);
      }
    } catch (err) {
      logError(err, 'Create.handleSubmit');
      const errorDetails = parseWalletError(err);
      setError(errorDetails.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      {/* Header */}
      <AppHeader currentPage="create" />

      {/* Network Status */}
      <NetworkStatus isHealthy={true} network="testnet" />

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Create Data Stream Schema</h1>
          <p className="text-gray-400">
            Register a new data schema on Somnia Data Streams Protocol
          </p>
        </div>

        {/* Connection Status Banner */}
        {!isConnected && (
          <Alert
            type="warning"
            title="Wallet Not Connected"
            message="Please connect your wallet to register a schema"
          />
        )}

        {/* Network Warning */}
        {isConnected && chain?.id !== 5031 && (
          <Alert
            type="error"
            title="Wrong Network"
            message="Please switch to Somnia Testnet (Chain ID: 5031) in your wallet"
          />
        )}

        {/* Success Message */}
        {success && (
          <Alert
            type="success"
            title="Schema Registered!"
            message={success}
            onClose={() => setSuccess(null)}
            dismissible
          />
        )}

        {/* Error Message */}
        {error && (
          <Alert
            type="error"
            title="Registration Failed"
            message={error}
            onClose={() => setError(null)}
            dismissible
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded p-6 space-y-6">
              {/* Schema Name */}
              <div>
                <label className="block text-sm font-bold mb-2">
                  SCHEMA NAME <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={schemaName}
                  onChange={(e) => setSchemaName(e.target.value)}
                  placeholder="e.g., UserProfile, TokenTransfer"
                  className="w-full bg-black border border-gray-700 rounded px-4 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-orange-400"
                  disabled={isSubmitting}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  A human-readable name for your schema
                </p>
              </div>

              {/* Schema Definition */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold">
                    SCHEMA DEFINITION <span className="text-red-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowTemplates(!showTemplates)}
                      className="text-xs text-orange-400 hover:text-orange-300"
                    >
                      {showTemplates ? 'Hide' : 'Show'} Templates
                    </button>
                    <button
                      type="button"
                      onClick={handleFormatSchema}
                      className="text-xs text-orange-400 hover:text-orange-300"
                      disabled={!schemaDefinition.trim()}
                    >
                      Format
                    </button>
                  </div>
                </div>
                <textarea
                  value={schemaDefinition}
                  onChange={(e) => setSchemaDefinition(e.target.value)}
                  placeholder="uint256 value, string name, address owner"
                  className="w-full bg-black border border-gray-700 rounded px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-400 font-mono text-sm"
                  rows={4}
                  disabled={isSubmitting}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Comma-separated list of Solidity types and names
                </p>
              </div>

              {/* Validation Feedback */}
              {validation && (
                <div className={`border rounded p-4 ${
                  validation.isValid ? 'bg-green-950 border-green-900' : 'bg-red-950 border-red-900'
                }`}>
                  <div className="flex items-start gap-2">
                    {validation.isValid ? (
                      <svg className="w-5 h-5 text-green-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-bold mb-1">
                        {validation.isValid ? 'Schema is valid!' : 'Validation Errors:'}
                      </div>
                      {validation.errors.length > 0 && (
                        <ul className="text-sm space-y-1">
                          {validation.errors.map((err, i) => (
                            <li key={i} className="text-red-400">• {err}</li>
                          ))}
                        </ul>
                      )}
                      {validation.warnings.length > 0 && (
                        <ul className="text-sm space-y-1 mt-2">
                          {validation.warnings.map((warn, i) => (
                            <li key={i} className="text-yellow-400">⚠ {warn}</li>
                          ))}
                        </ul>
                      )}
                      {validation.isValid && validation.fields.length > 0 && (
                        <div className="text-sm text-gray-400 mt-2">
                          {validation.fields.length} field{validation.fields.length > 1 ? 's' : ''} detected
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Computed Schema ID */}
              {computedSchemaId && (
                <div className="bg-gray-800 border border-gray-700 rounded p-4">
                  <div className="text-xs text-gray-400 mb-1">COMPUTED SCHEMA ID</div>
                  <div className="font-mono text-sm break-all">{computedSchemaId}</div>
                </div>
              )}

              {/* Parent Schema (Optional) */}
              <div>
                <label className="flex items-center gap-2 mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useParent}
                    onChange={(e) => setUseParent(e.target.checked)}
                    className="w-4 h-4 accent-orange-400"
                  />
                  <span className="text-sm font-bold">EXTEND PARENT SCHEMA</span>
                </label>
                {useParent && (
                  <>
                    <input
                      type="text"
                      value={parentSchemaId}
                      onChange={(e) => setParentSchemaId(e.target.value)}
                      placeholder="0x..."
                      className="w-full bg-black border border-gray-700 rounded px-4 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-orange-400 font-mono text-sm"
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Optional: Schema ID to extend (bytes32 hex)
                    </p>
                  </>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !isConnected || !validation?.isValid || chain?.id !== 5031}
                className="w-full bg-orange-400 text-black px-6 py-3 rounded font-bold hover:bg-orange-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'REGISTERING...' : 'REGISTER SCHEMA'}
              </button>
            </form>
          </div>

          {/* Sidebar - Templates & Info */}
          <div className="space-y-6">
            {/* Schema Info */}
            <div className="bg-gray-900 border border-gray-800 rounded p-6">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                SCHEMA FORMAT
              </h3>
              <div className="text-xs text-gray-400 space-y-2">
                <p>Define your schema using Solidity types:</p>
                <div className="bg-black rounded p-2 font-mono">
                  type1 name1, type2 name2
                </div>
                <p className="pt-2">Supported types:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>address, bool, string</li>
                  <li>uint8-256, int8-256</li>
                  <li>bytes, bytes1-32</li>
                  <li>Arrays: type[], type[N]</li>
                </ul>
              </div>
            </div>

            {/* Templates */}
            {showTemplates && (
              <div className="bg-gray-900 border border-gray-800 rounded p-6">
                <h3 className="text-sm font-bold mb-4">TEMPLATES</h3>
                
                {/* Category Filter */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`text-xs px-3 py-1 rounded ${
                        selectedCategory === cat
                          ? 'bg-orange-400 text-black'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Template List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredTemplates.map(template => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleTemplateSelect(template)}
                      className="w-full text-left bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded p-3 transition"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-xl">{template.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold">{template.name}</div>
                          <div className="text-xs text-gray-400 mb-1">{template.description}</div>
                          <div className="text-xs text-orange-400 truncate font-mono">
                            {template.schema}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Create;
