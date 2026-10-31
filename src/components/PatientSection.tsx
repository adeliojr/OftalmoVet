import React, { useState } from 'react';
import { Patient, LocationInfo } from '../types';
import { User, Calendar, Tag, Camera, Sparkles } from 'lucide-react';
import { Section } from './Section';
import { FotoSistemaModal } from './modals/FotoSistemaModal';

interface PatientSectionProps {
  patient: Patient;
  location: LocationInfo;
  onPatientChange: (field: keyof Patient, val: string) => void;
  onLocationChange: (field: keyof LocationInfo, val: string) => void;
  onAplicarDadosCompletos?: (dados: Partial<Patient>, tipoConsulta?: string) => void;
  chaveUsuario?: string;
}

export const PatientSection: React.FC<PatientSectionProps> = ({
  patient,
  location,
  onPatientChange,
  onLocationChange,
  onAplicarDadosCompletos,
  chaveUsuario,
}) => {
  const [modalFotoAberto, setModalFotoAberto] = useState(false);

  return (
    <Section
      title="Identificação do Paciente"
      icon={<User className="w-5 h-5 text-blue-600" />}
      subtitle="Dados cadastrais do animal, tutor e data do atendimento"
      badge={
        <button
          onClick={() => setModalFotoAberto(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs border border-blue-200 shadow-2xs transition-all active:scale-[0.98]"
          title="Tirar foto da tela do sistema do hospital ou colar print para extrair dados com IA"
        >
          <Camera className="w-3.5 h-3.5 text-blue-600" />
          <span>Foto do Sistema Hospitalar</span>
        </button>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nome do Paciente <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium transition-all"
            placeholder="Ex: Rex, Mel, Thor..."
            value={patient.nome}
            onChange={(e) => onPatientChange('nome', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Tutor(a)</label>
          <input
            type="text"
            className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
            placeholder="Ex: Carlos Oliveira"
            value={patient.tutor}
            onChange={(e) => onPatientChange('tutor', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Espécie</label>
          <input
            type="text"
            className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
            placeholder="Ex: Canina, Felina, Equina..."
            value={patient.especie}
            onChange={(e) => onPatientChange('especie', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Raça</label>
          <input
            type="text"
            className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
            placeholder="Ex: Shih-tzu, Pug, SRD..."
            value={patient.raca}
            onChange={(e) => onPatientChange('raca', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Sexo</label>
          <select
            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
            value={patient.sexo}
            onChange={(e) => onPatientChange('sexo', e.target.value)}
          >
            <option value="">Selecione...</option>
            <option value="Macho">Macho</option>
            <option value="Fêmea">Fêmea</option>
            <option value="Macho (Castrado)">Macho (Castrado)</option>
            <option value="Fêmea (Castrada)">Fêmea (Castrada)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Idade</label>
          <input
            type="text"
            className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
            placeholder="Ex: 5 anos, 8 meses..."
            value={patient.idade}
            onChange={(e) => onPatientChange('idade', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Data do Atendimento
          </label>
          <input
            type="date"
            className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
            value={location.data}
            onChange={(e) => onLocationChange('data', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            Tipo de Consulta
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
            placeholder="Ex: Primeira Consulta, Retorno, Emergência..."
            value={location.tipoConsulta}
            onChange={(e) => onLocationChange('tipoConsulta', e.target.value)}
          />
        </div>
      </div>

      <FotoSistemaModal
        aberto={modalFotoAberto}
        onFechar={() => setModalFotoAberto(false)}
        onAplicar={(dados) => {
          if (onAplicarDadosCompletos) {
            onAplicarDadosCompletos(
              {
                nome: dados.nome,
                especie: dados.especie,
                raca: dados.raca,
                sexo: dados.sexo,
                idade: dados.idade,
                tutor: dados.tutor,
              },
              dados.tipoConsulta
            );
          } else {
            if (dados.nome) onPatientChange('nome', dados.nome);
            if (dados.especie) onPatientChange('especie', dados.especie);
            if (dados.raca) onPatientChange('raca', dados.raca);
            if (dados.sexo) onPatientChange('sexo', dados.sexo);
            if (dados.idade) onPatientChange('idade', dados.idade);
            if (dados.tutor) onPatientChange('tutor', dados.tutor);
            if (dados.tipoConsulta) onLocationChange('tipoConsulta', dados.tipoConsulta);
          }
        }}
        chaveUsuario={chaveUsuario}
      />
    </Section>
  );
};
