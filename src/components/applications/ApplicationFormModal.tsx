import React, { useState, useEffect } from 'react';
import { useJobContext } from '../../context/JobContext';
import {
  X,
  Building2,
  Briefcase,
  Link,
  MapPin,
  Calendar,
  DollarSign,
  Tag,
  FileText,
  AlertCircle,
  Plus,
} from 'lucide-react';
import {
  ApplicationStatus,
  Modality,
  ContractType,
  Priority,
  JobPlatform,
  JobApplication,
} from '../../types';

export const ApplicationFormModal: React.FC = () => {
  const {
    isNewApplicationModalOpen,
    setIsNewApplicationModalOpen,
    editingApplicationId,
    setEditingApplicationId,
    applications,
    addApplication,
    updateApplication,
    cvVersions,
  } = useJobContext();

  const isOpen = isNewApplicationModalOpen || editingApplicationId !== null;
  const editingApp = applications.find((a) => a.id === editingApplicationId);

  // Form states
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [platform, setPlatform] = useState<JobPlatform>('LinkedIn');
  const [location, setLocation] = useState('Remoto');
  const [modality, setModality] = useState<Modality>('remoto');
  const [contractType, setContractType] = useState<ContractType>('CLT');
  const [salaryRange, setSalaryRange] = useState('');
  const [appliedDate, setAppliedDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<ApplicationStatus>('candidatado');
  const [priority, setPriority] = useState<Priority>('media');
  const [cvVersion, setCvVersion] = useState(cvVersions[0]?.title || 'CV Padrão');
  const [tagInput, setTagInput] = useState('');
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  // Validation
  const [errors, setErrors] = useState<{ company?: string; role?: string }>({});

  useEffect(() => {
    if (editingApp) {
      setCompany(editingApp.company);
      setRole(editingApp.role);
      setJobUrl(editingApp.jobUrl || '');
      setPlatform(editingApp.platform);
      setLocation(editingApp.location);
      setModality(editingApp.modality);
      setContractType(editingApp.contractType);
      setSalaryRange(editingApp.salaryRange || '');
      setAppliedDate(editingApp.appliedDate);
      setStatus(editingApp.status);
      setPriority(editingApp.priority);
      setCvVersion(editingApp.cvVersion);
      setTechnologies(editingApp.technologies || []);
      setDescription(editingApp.description || '');
      setNotes(editingApp.notes || '');
    } else {
      setCompany('');
      setRole('');
      setJobUrl('');
      setPlatform('LinkedIn');
      setLocation('Remoto');
      setModality('remoto');
      setContractType('CLT');
      setSalaryRange('');
      setAppliedDate(new Date().toISOString().split('T')[0]);
      setStatus('candidatado');
      setPriority('media');
      setCvVersion(cvVersions[0]?.title || 'CV Padrão');
      setDescription('');
      setNotes('');
    }
    setErrors({});
  }, [editingApp, isOpen, cvVersions]);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsNewApplicationModalOpen(false);
    setEditingApplicationId(null);
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !technologies.includes(trimmed)) {
      setTechnologies([...technologies, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (techToRemove: string) => {
    setTechnologies(technologies.filter((t) => t !== techToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { company?: string; role?: string } = {};
    if (!company.trim()) newErrors.company = 'Nome da empresa é obrigatório';
    if (!role.trim()) newErrors.role = 'Cargo da vaga é obrigatório';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (editingApplicationId) {
      updateApplication(editingApplicationId, {
        company: company.trim(),
        role: role.trim(),
        jobUrl: jobUrl.trim(),
        platform,
        location: location.trim(),
        modality,
        contractType,
        salaryRange: salaryRange.trim(),
        appliedDate,
        status,
        priority,
        cvVersion,
        technologies,
        description: description.trim(),
        notes: notes.trim(),
      });
    } else {
      // Pick a random soft color for logo
      const colors = ['#3FBF8A', '#e5a93b', '#4cb3f0', '#e5484d', '#a1a4aa', '#d98e5f'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      addApplication({
        company: company.trim(),
        role: role.trim(),
        jobUrl: jobUrl.trim(),
        platform,
        location: location.trim(),
        modality,
        contractType,
        salaryRange: salaryRange.trim(),
        appliedDate,
        updatedDate: appliedDate,
        status,
        priority,
        cvVersion,
        technologies,
        description: description.trim(),
        notes: notes.trim(),
        companyLogoColor: randomColor,
      });
    }

    handleClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-8 bg-[#16181b] border-[#25272b] text-[#f4f5f6] dark:bg-[#16181b] dark:border-[#25272b] dark:text-[#f4f5f6] light:bg-white light:border-neutral-200 light:text-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#25272b] dark:border-[#25272b] light:border-neutral-200">
          <div>
            <h2 className="text-base font-semibold">
              {editingApplicationId ? 'Editar candidatura' : 'Nova candidatura'}
            </h2>
            <p className="text-xs text-neutral-400 dark:text-[#a1a4aa] light:text-neutral-600 mt-0.5">
              Cadastre todos os detalhes para acompanhar o andamento do processo.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
          {/* Seção 1: Informações da vaga */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-[#25272b]/60 dark:border-[#25272b]/60 light:border-neutral-200">
              <Building2 className="w-4 h-4 text-[#a1a4aa]" />
              <h3 className="text-sm font-medium text-[#f4f5f6]">
                1. Informações da vaga
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nome da empresa */}
              <div>
                <label className="block text-xs font-medium mb-1">
                  Nome da empresa <span className="text-[#e5484d]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Tech Solutions"
                  value={company}
                  onChange={(e) => {
                    setCompany(e.target.value);
                    if (errors.company) setErrors({ ...errors, company: undefined });
                  }}
                  className={`w-full px-3 py-2 rounded-lg border text-xs bg-[#0b0c0e] dark:bg-[#0b0c0e] light:bg-neutral-50 text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900 outline-hidden focus:border-[#5a5d63] ${
                    errors.company ? 'border-[#e5484d]' : 'border-[#25272b] dark:border-[#25272b] light:border-neutral-200'
                  }`}
                />
                {errors.company && (
                  <p className="text-xs text-[#e5484d] mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.company}
                  </p>
                )}
              </div>

              {/* Cargo */}
              <div>
                <label className="block text-xs font-medium mb-1">
                  Cargo / Título <span className="text-[#e5484d]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Desenvolvedor Java Júnior"
                  value={role}
                  onChange={(e) => {
                    setRole(e.target.value);
                    if (errors.role) setErrors({ ...errors, role: undefined });
                  }}
                  className={`w-full px-3 py-2 rounded-lg border text-xs bg-[#0b0c0e] dark:bg-[#0b0c0e] light:bg-neutral-50 text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900 outline-hidden focus:border-[#5a5d63] ${
                    errors.role ? 'border-[#e5484d]' : 'border-[#25272b] dark:border-[#25272b] light:border-neutral-200'
                  }`}
                />
                {errors.role && (
                  <p className="text-xs text-[#e5484d] mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.role}
                  </p>
                )}
              </div>

              {/* Link da vaga */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1">Link da vaga</label>
                <div className="relative">
                  <Link className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="url"
                    placeholder="https://..."
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border text-xs bg-[#0b0c0e] dark:bg-[#0b0c0e] light:bg-neutral-50 border-[#25272b] dark:border-[#25272b] light:border-neutral-200 text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900 outline-hidden focus:border-[#5a5d63]"
                  />
                </div>
              </div>

              {/* Plataforma */}
              <div>
                <label className="block text-xs font-medium mb-1">Plataforma</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as JobPlatform)}
                  className="w-full px-3 py-2 rounded-lg border text-xs bg-[#0b0c0e] dark:bg-[#0b0c0e] light:bg-neutral-50 border-[#25272b] dark:border-[#25272b] light:border-neutral-200 text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900 outline-hidden"
                >
                  <option value="LinkedIn" className="bg-[#16181b]">LinkedIn</option>
                  <option value="Gupy" className="bg-[#16181b]">Gupy</option>
                  <option value="Indeed" className="bg-[#16181b]">Indeed</option>
                  <option value="Site da empresa" className="bg-[#16181b]">Site da empresa</option>
                  <option value="Glassdoor" className="bg-[#16181b]">Glassdoor</option>
                  <option value="Catho" className="bg-[#16181b]">Catho</option>
                  <option value="Programa de Talentos" className="bg-[#16181b]">Programa de Talentos</option>
                  <option value="Indicação" className="bg-[#16181b]">Indicação</option>
                  <option value="Outra" className="bg-[#16181b]">Outra</option>
                </select>
              </div>

              {/* Localização */}
              <div>
                <label className="block text-xs font-medium mb-1">Localização</label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Ex: São Paulo, SP ou Remoto Brasil"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border text-xs bg-[#0b0c0e] dark:bg-[#0b0c0e] light:bg-neutral-50 border-[#25272b] dark:border-[#25272b] light:border-neutral-200 text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900 outline-hidden focus:border-[#5a5d63]"
                  />
                </div>
              </div>

              {/* Modalidade */}
              <div>
                <label className="block text-xs font-medium mb-1">Modalidade de trabalho</label>
                <select
                  value={modality}
                  onChange={(e) => setModality(e.target.value as Modality)}
                  className="w-full px-3 py-2 rounded-lg border text-xs bg-[#0b0c0e] dark:bg-[#0b0c0e] light:bg-neutral-50 border-[#25272b] dark:border-[#25272b] light:border-neutral-200 text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900 outline-hidden"
                >
                  <option value="remoto" className="bg-[#16181b]">Remoto</option>
                  <option value="hibrido" className="bg-[#16181b]">Híbrido</option>
                  <option value="presencial" className="bg-[#16181b]">Presencial</option>
                </select>
              </div>

              {/* Tipo de contratação */}
              <div>
                <label className="block text-xs font-medium mb-1">Tipo de contratação</label>
                <select
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value as ContractType)}
                  className="w-full px-3 py-2 rounded-lg border text-xs bg-[#0b0c0e] dark:bg-[#0b0c0e] light:bg-neutral-50 border-[#25272b] dark:border-[#25272b] light:border-neutral-200 text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900 outline-hidden"
                >
                  <option value="CLT" className="bg-[#16181b]">CLT</option>
                  <option value="PJ" className="bg-[#16181b]">PJ</option>
                  <option value="Estágio" className="bg-[#16181b]">Estágio</option>
                  <option value="Temporário" className="bg-[#16181b]">Temporário</option>
                </select>
              </div>

              {/* Faixa salarial */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1">Faixa salarial (se informada)</label>
                <div className="relative">
                  <DollarSign className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Ex: R$ 4.500 - R$ 5.800 ou A combinar"
                    value={salaryRange}
                    onChange={(e) => setSalaryRange(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border text-xs bg-[#0b0c0e] dark:bg-[#0b0c0e] light:bg-neutral-50 border-[#25272b] dark:border-[#25272b] light:border-neutral-200 text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900 outline-hidden focus:border-[#5a5d63]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Seção 2: Informações da candidatura */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-[#25272b]/60 dark:border-[#25272b]/60 light:border-neutral-200">
              <Briefcase className="w-4 h-4 text-[#3FBF8A]" />
              <h3 className="text-sm font-medium text-[#f4f5f6]">
                2. Informações da candidatura
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Data da candidatura */}
              <div>
                <label className="block text-xs font-medium mb-1">Data da candidatura</label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    value={appliedDate}
                    onChange={(e) => setAppliedDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border text-xs bg-[#0b0c0e] dark:bg-[#0b0c0e] light:bg-neutral-50 border-[#25272b] dark:border-[#25272b] light:border-neutral-200 text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900 outline-hidden"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-medium mb-1">Status atual</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
                  className="w-full px-3 py-2 rounded-lg border text-xs bg-[#0b0c0e] dark:bg-[#0b0c0e] light:bg-neutral-50 border-[#25272b] dark:border-[#25272b] light:border-neutral-200 text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900 outline-hidden"
                >
                  <option value="candidatado" className="bg-[#16181b]">Candidatado</option>
                  <option value="em_analise" className="bg-[#16181b]">Em análise</option>
                  <option value="entrevista" className="bg-[#16181b]">Entrevista</option>
                  <option value="teste_tecnico" className="bg-[#16181b]">Teste técnico</option>
                  <option value="proposta" className="bg-[#16181b]">Proposta</option>
                  <option value="aprovado" className="bg-[#16181b]">Aprovado</option>
                  <option value="reprovado" className="bg-[#16181b]">Reprovado</option>
                  <option value="sem_resposta" className="bg-[#16181b]">Sem resposta</option>
                  <option value="desistencia" className="bg-[#16181b]">Desistência</option>
                </select>
              </div>

              {/* Prioridade */}
              <div>
                <label className="block text-xs font-medium mb-1">Prioridade</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="w-full px-3 py-2 rounded-lg border text-xs bg-[#0b0c0e] dark:bg-[#0b0c0e] light:bg-neutral-50 border-[#25272b] dark:border-[#25272b] light:border-neutral-200 text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900 outline-hidden"
                >
                  <option value="baixa" className="bg-[#16181b]">Baixa (!)</option>
                  <option value="media" className="bg-[#16181b]">Média (!!)</option>
                  <option value="alta" className="bg-[#16181b]">Alta (!!!)</option>
                </select>
              </div>
            </div>

            {/* Versão do CV */}
            <div>
              <label className="block text-xs font-medium mb-1">Versão do currículo enviada</label>
              <select
                value={cvVersion}
                onChange={(e) => setCvVersion(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-xs bg-[#0b0c0e] dark:bg-[#0b0c0e] light:bg-neutral-50 border-[#25272b] dark:border-[#25272b] light:border-neutral-200 text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900 outline-hidden"
              >
                {cvVersions.map((cv) => (
                  <option key={cv.id} value={cv.title} className="bg-[#16181b]">
                    {cv.title} ({cv.filename})
                  </option>
                ))}
              </select>
            </div>

            {/* Tecnologias exigidas (tags) */}
            <div>
              <label className="block text-xs font-medium mb-1">Tecnologias exigidas</label>
              <div className="flex items-center gap-2 mb-2">
                <div className="relative flex-1">
                  <Tag className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Digite uma tecnologia e aperte Enter (ex: Java, React, SQL)"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg border text-xs bg-[#0b0c0e] dark:bg-[#0b0c0e] light:bg-neutral-50 border-[#25272b] dark:border-[#25272b] light:border-neutral-200 text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900 outline-hidden focus:border-[#5a5d63]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-1.5 rounded-lg border border-[#25272b] text-xs font-medium hover:bg-white/5 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar</span>
                </button>
              </div>

              {/* Tag Chips */}
              <div className="flex flex-wrap items-center gap-1.5 min-h-7 p-2 rounded-lg border border-[#25272b]/60 dark:border-[#25272b]/60 light:border-neutral-200 bg-[#0b0c0e]/40">
                {technologies.length === 0 ? (
                  <span className="text-xs text-neutral-500 italic">
                    Nenhuma tecnologia adicionada ainda
                  </span>
                ) : (
                  technologies.map((tech) => (
                    <span
                      key={tech}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-white/5 border border-[#25272b] text-neutral-200"
                    >
                      {tech}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tech)}
                        className="hover:text-[#e5484d] p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Descrição da vaga */}
            <div>
              <label className="block text-xs font-medium mb-1">Descrição completa da vaga</label>
              <textarea
                rows={3}
                placeholder="Cole aqui os requisitos, responsabilidades e diferenciais..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 rounded-lg border text-xs bg-[#0b0c0e] dark:bg-[#0b0c0e] light:bg-neutral-50 border-[#25272b] dark:border-[#25272b] light:border-neutral-200 text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900 outline-hidden focus:border-[#5a5d63] resize-y"
              />
            </div>

            {/* Observações pessoais */}
            <div>
              <label className="block text-xs font-medium mb-1">Observações pessoais</label>
              <textarea
                rows={2}
                placeholder="Ex: Contato do recrutador, pontos a reforçar na entrevista, indicação de amigo..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 rounded-lg border text-xs bg-[#0b0c0e] dark:bg-[#0b0c0e] light:bg-neutral-50 border-[#25272b] dark:border-[#25272b] light:border-neutral-200 text-[#f4f5f6] dark:text-[#f4f5f6] light:text-neutral-900 outline-hidden focus:border-[#5a5d63] resize-y"
              />
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#25272b] dark:border-[#25272b] light:border-neutral-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-lg text-xs font-medium border border-[#25272b] text-neutral-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-full text-xs font-medium text-black bg-white hover:bg-[#e5e5e5] transition-colors"
            >
              {editingApplicationId ? 'Salvar alterações' : 'Salvar candidatura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
