import React, { useState, useRef } from 'react';
import { useJobContext } from '../../context/JobContext';
import {
  Sun,
  Moon,
  Laptop,
  Download,
  Upload,
  FileText,
  Plus,
  Trash2,
  RefreshCw,
  Github,
  ShieldCheck,
  Database,
  ExternalLink,
  CheckCircle,
  CalendarDays,
} from 'lucide-react';
import { STATUS_CONFIG } from '../../utils/formatters';
import { exportAllEventsICS } from '../../utils/calendarSync';

export const SettingsView: React.FC = () => {
  const {
    theme,
    setTheme,
    cvVersions,
    addCVVersion,
    deleteCVVersion,
    exportDataJSON,
    exportDataCSV,
    importDataJSON,
    resetToDefaultData,
    applications,
    events,
    isGoogleCalendarConfigured,
    googleCalendarConnected,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
  } = useJobContext();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // New CV Form
  const [newCvTitle, setNewCvTitle] = useState('');
  const [newCvFilename, setNewCvFilename] = useState('');
  const [newCvFocus, setNewCvFocus] = useState('');
  const [isAddingCv, setIsAddingCv] = useState(false);

  const handleAddCvSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCvTitle.trim() || !newCvFilename.trim()) return;

    addCVVersion({
      title: newCvTitle.trim(),
      filename: newCvFilename.trim(),
      focus: newCvFocus.trim() || 'Geral',
      updatedAt: new Date().toISOString().split('T')[0],
    });

    setNewCvTitle('');
    setNewCvFilename('');
    setNewCvFocus('');
    setIsAddingCv(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        importDataJSON(content);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900">
          Configurações
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400 dark:text-[#a1a4aa] light:text-neutral-600 mt-0.5">
          Preferências locais, versões de currículo e exportação de backups.
        </p>
      </div>

      {/* SEÇÃO 1: Preferência de Tema */}
      <div className="p-5 rounded-2xl bg-[#16181b] border-[#25272b] dark:bg-[#16181b] dark:border-[#25272b] light:bg-white light:border-neutral-200 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900">
            Aparência & Tema
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Selecione a preferência de iluminação da interface.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { key: 'dark', label: 'Escuro (Linear)', icon: Moon },
            { key: 'light', label: 'Claro', icon: Sun },
            { key: 'system', label: 'Sistema', icon: Laptop },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = theme === item.key;

            return (
              <button
                key={item.key}
                onClick={() => setTheme(item.key as any)}
                className={`p-3 rounded-lg border text-xs font-medium flex flex-col items-center justify-center gap-2 transition-colors ${
                  isSelected
                    ? 'border-[#5a5d63] bg-white/[0.06] text-white'
                    : 'border-[#25272b] text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SEÇÃO 2: Gerenciamento de Versões de Currículo */}
      <div className="p-5 rounded-2xl bg-[#16181b] border-[#25272b] dark:bg-[#16181b] dark:border-[#25272b] light:bg-white light:border-neutral-200 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900">
              Versões de currículo
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Organize as diferentes variações do seu CV enviadas para as empresas.
            </p>
          </div>

          <button
            onClick={() => setIsAddingCv((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-black bg-white hover:bg-[#e5e5e5] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar versão</span>
          </button>
        </div>

        {/* Add CV Form */}
        {isAddingCv && (
          <form
            onSubmit={handleAddCvSubmit}
            className="p-4 rounded-lg border border-[#25272b] bg-[#0b0c0e] space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Título da versão *</label>
                <input
                  type="text"
                  placeholder="Ex: CV Backend Java 2026"
                  value={newCvTitle}
                  onChange={(e) => setNewCvTitle(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 rounded-lg border text-xs bg-[#16181b] border-[#25272b] text-[#f4f5f6] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Nome do arquivo PDF *</label>
                <input
                  type="text"
                  placeholder="Ex: Curriculo_Java_Backend.pdf"
                  value={newCvFilename}
                  onChange={(e) => setNewCvFilename(e.target.value)}
                  required
                  className="w-full px-3 py-1.5 rounded-lg border text-xs bg-[#16181b] border-[#25272b] text-[#f4f5f6] outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1">Foco / Tecnologias principais</label>
                <input
                  type="text"
                  placeholder="Ex: Java 21, Spring Boot, Microservices, PostgreSQL"
                  value={newCvFocus}
                  onChange={(e) => setNewCvFocus(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border text-xs bg-[#16181b] border-[#25272b] text-[#f4f5f6] outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingCv(false)}
                className="px-3 py-1 text-xs rounded border border-[#25272b] text-neutral-300 hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3 py-1 text-xs rounded-full font-medium text-black bg-white hover:bg-[#e5e5e5]"
              >
                Salvar versão
              </button>
            </div>
          </form>
        )}

        {/* CV List */}
        <div className="space-y-2">
          {cvVersions.map((cv) => (
            <div
              key={cv.id}
              className="p-3 rounded-lg border border-[#25272b]/80 bg-[#0b0c0e]/40 flex items-start justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-[#a1a4aa]" />
                  <span className="font-semibold text-neutral-200">{cv.title}</span>
                  <span className="text-xs tabular-nums text-neutral-400 px-1.5 py-0.2 rounded bg-white/5">
                    {cv.filename}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 pl-5.5">
                  Foco: <span className="text-neutral-300">{cv.focus}</span> · Atualizado em{' '}
                  {cv.updatedAt}
                </p>
              </div>

              {cvVersions.length > 1 && (
                <button
                  onClick={() => deleteCVVersion(cv.id)}
                  className="p-1 text-neutral-400 hover:text-[#e5484d] rounded hover:bg-white/5"
                  title="Remover versão"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SEÇÃO 2.5: Sincronização com Google Agenda & Celular */}
      <div className="p-5 rounded-2xl bg-[#16181b] border-[#25272b] dark:bg-[#16181b] dark:border-[#25272b] light:bg-white light:border-neutral-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900">
              Google Agenda & Calendário do Celular
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Sincronize entrevistas automaticamente via API ou exporte em formato .ics universal (Android / iPhone).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isGoogleCalendarConfigured && (
              <button
                onClick={() =>
                  googleCalendarConnected
                    ? disconnectGoogleCalendar()
                    : void connectGoogleCalendar()
                }
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  googleCalendarConnected
                    ? 'bg-[#13261d] text-[#5ad19e] border border-[#1f4632]'
                    : 'bg-white text-black hover:bg-[#e5e5e5]'
                }`}
              >
                {googleCalendarConnected ? 'Desconectar Google Agenda' : 'Conectar conta Google'}
              </button>
            )}

            <button
              onClick={() => exportAllEventsICS(events)}
              disabled={events.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#25272b] bg-[#202226] text-xs font-medium text-[#c8cace] hover:text-white transition-colors disabled:opacity-40"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Baixar agenda (.ics)</span>
            </button>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#202226] text-xs text-[#a1a4aa] space-y-1.5 leading-relaxed">
          {isGoogleCalendarConfigured ? (
            <p>
              <strong className="text-[#f4f5f6]">Modo Automático (Google Calendar API):</strong>{' '}
              {googleCalendarConnected
                ? 'Ativo. Toda reunião criada, editada ou removida na aba Agenda é sincronizada automaticamente com sua conta Google.'
                : 'Conecte sua conta Google acima para enviar reuniões automaticamente em segundo plano.'}
            </p>
          ) : (
            <p>
              <strong className="text-[#f4f5f6]">Modo Direto & .ics ativo:</strong> Você pode enviar qualquer evento para o Google Agenda com 1 clique ou baixar o arquivo <code className="text-[#f4f5f6]">.ics</code> para abrir no celular. Para sincronização 100% invisível via API, basta adicionar <code className="text-[#f4f5f6]">VITE_GOOGLE_CLIENT_ID</code> no arquivo <code className="text-[#f4f5f6]">.env</code>.
            </p>
          )}
        </div>
      </div>

      {/* SEÇÃO 3: Backup, Exportação e Importação */}
      <div className="p-5 rounded-2xl bg-[#16181b] border-[#25272b] dark:bg-[#16181b] dark:border-[#25272b] light:bg-white light:border-neutral-200 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900">
            Exportação & Importação de dados
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Seus dados são 100% seus e salvos localmente no navegador. Exporte backups a qualquer momento.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Download JSON */}
          <button
            onClick={exportDataJSON}
            className="p-4 rounded-lg border-[#25272b] bg-[#202226] hover:bg-[#0b0c0e] transition-colors flex items-start gap-3 text-left"
          >
            <Download className="w-5 h-5 text-[#a1a4aa] shrink-0 mt-0.5" />
            <div>
              <span className="block font-semibold text-xs text-[#f4f5f6]">
                Exportar Backup completo (JSON)
              </span>
              <span className="block text-xs text-neutral-400 mt-0.5 leading-relaxed">
                Salva todas as {applications.length} candidaturas, histórico de atividades, agenda e versões de CV em um arquivo.
              </span>
            </div>
          </button>

          {/* Download CSV */}
          <button
            onClick={exportDataCSV}
            className="p-4 rounded-lg border-[#25272b] bg-[#202226] hover:bg-[#0b0c0e] transition-colors flex items-start gap-3 text-left"
          >
            <Download className="w-5 h-5 text-[#3FBF8A] shrink-0 mt-0.5" />
            <div>
              <span className="block font-semibold text-xs text-[#f4f5f6]">
                Exportar para Planilha (CSV)
              </span>
              <span className="block text-xs text-neutral-400 mt-0.5 leading-relaxed">
                Compatível com Excel, Google Planilhas e Notion para relatórios tabulares.
              </span>
            </div>
          </button>
        </div>

        {/* Import JSON */}
        <div className="p-3.5 rounded-lg border border-[#25272b]/80 bg-[#0b0c0e]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-xs text-neutral-200 block">
              Restaurar de arquivo de backup
            </span>
            <span className="text-xs text-neutral-400 block">
              Substitui os dados atuais pelos dados do arquivo JSON selecionado.
            </span>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#25272b] text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/5 transition-colors shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Selecionar arquivo JSON</span>
          </button>
        </div>

        {/* Clear Database Data */}
        <div className="pt-2 flex justify-between items-center text-xs">
          <span className="text-neutral-400">Deseja zerar todos os registros do banco?</span>
          <button
            onClick={resetToDefaultData}
            className="flex items-center gap-1 text-[#e5484d] hover:underline"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Limpar todos os dados</span>
          </button>
        </div>
      </div>

      {/* SEÇÃO 4: Informações do Sistema */}
      <div className="p-5 rounded-2xl bg-[#16181b] border-[#25272b] dark:bg-[#16181b] dark:border-[#25272b] light:bg-white light:border-neutral-200 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#3FBF8A]" />
          <h2 className="text-sm font-semibold text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900">
            Sobre o JobFlow
          </h2>
        </div>

        <p className="text-xs text-neutral-400 leading-relaxed">
          O <strong>JobFlow</strong> é um aplicativo web open source pessoal, desenvolvido com React, TypeScript e Tailwind CSS, projetado para oferecer a melhor experiência de produtividade individual no gerenciamento de vagas de emprego.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-2">
          <div className="p-2.5 rounded-lg bg-[#202226] border-[#25272b]">
            <span className="text-xs text-neutral-500 block">Versão</span>
            <span className="tabular-nums text-neutral-300">v1.2.0 (Open Source)</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#202226] border-[#25272b]">
            <span className="text-xs text-neutral-500 block">Licença</span>
            <span className="tabular-nums text-neutral-300">MIT License</span>
          </div>
          <div className="p-2.5 rounded-lg bg-[#202226] border-[#25272b]">
            <span className="text-xs text-neutral-500 block">Privacidade</span>
            <span className="tabular-nums text-neutral-300">Sem rastreamento</span>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <a
            href="https://github.com/luanrichardsz/JobFlow"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-[#f4f5f6] hover:underline"
          >
            <Github className="w-4 h-4" />
            <span>Repositório GitHub do projeto</span>
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </a>

          <span className="text-xs tabular-nums text-neutral-500">Desenvolvido com padrão Linear</span>
        </div>
      </div>
    </div>
  );
};
