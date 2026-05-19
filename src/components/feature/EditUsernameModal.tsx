import { useState } from 'react';
import Button from '../base/Button';
import Modal from '../base/Modal';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  country: string;
  credits: number;
  provider?: string;
  createdAt: string;
  username?: string;
  avatar?: string;
}

interface EditUsernameModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onUsernameUpdate: (newUsername: string) => void;
}

export default function EditUsernameModal({ user, isOpen, onClose, onUsernameUpdate }: EditUsernameModalProps) {
  const [newUsername, setNewUsername] = useState(user.username || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const validateUsername = (username: string): string | null => {
    if (!username.trim()) {
      return 'El nombre de usuario es requerido';
    }
    if (username.length < 3) {
      return 'El nombre de usuario debe tener al menos 3 caracteres';
    }
    if (username.length > 20) {
      return 'El nombre de usuario no puede tener más de 20 caracteres';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return 'Solo se permiten letras, números y guiones bajos';
    }
    if (username.startsWith('_') || username.endsWith('_')) {
      return 'El nombre de usuario no puede empezar o terminar con guión bajo';
    }
    return null;
  };

  const handleSave = async () => {
    setError('');
    
    const validationError = validateUsername(newUsername);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (newUsername === user.username) {
      onClose();
      return;
    }

    setIsLoading(true);

    try {
      // Simular verificación de disponibilidad
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verificar si el username ya existe (simulado)
      const isAvailable = !['admin', 'root', 'test', 'user', 'support'].includes(newUsername.toLowerCase());
      
      if (!isAvailable) {
        setError('Este nombre de usuario ya está en uso');
        setIsLoading(false);
        return;
      }

      // Actualizar username
      onUsernameUpdate(newUsername);
      onClose();
      
    } catch (err) {
      setError('Error al actualizar el nombre de usuario. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setNewUsername(user.username || '');
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Cambiar Nombre de Usuario"
      size="md"
    >
      <div className="bg-slate-900 text-white -m-6 p-6">
        <div className="space-y-6">
          {/* Current Username */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <i className="ri-at-line text-cyan-400 text-xl"></i>
              <div>
                <div className="text-sm text-slate-400">Nombre de usuario actual</div>
                <div className="text-white font-semibold">
                  @{user.username || 'sin_configurar'}
                </div>
              </div>
            </div>
          </div>

          {/* New Username Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nuevo nombre de usuario
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-slate-400 text-lg">@</span>
              </div>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => {
                  setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                  setError('');
                }}
                className={`w-full bg-slate-800/50 border rounded-xl pl-8 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all duration-300 ${
                  error ? 'border-red-500/50' : 'border-slate-700/50'
                }`}
                placeholder="nuevo_usuario"
                maxLength={20}
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}
            
            {/* Rules */}
            <div className="mt-3 space-y-1 text-xs text-slate-400">
              <div className="flex items-center space-x-2">
                <i className="ri-information-line"></i>
                <span>Entre 3 y 20 caracteres</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="ri-information-line"></i>
                <span>Solo letras, números y guiones bajos</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="ri-information-line"></i>
                <span>No puede empezar o terminar con guión bajo</span>
              </div>
            </div>
          </div>

          {/* Preview */}
          {newUsername && !error && (
            <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <i className="ri-eye-line text-cyan-400"></i>
                <div>
                  <div className="text-sm text-slate-400">Vista previa</div>
                  <div className="text-cyan-400 font-semibold">@{newUsername}</div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <Button
              onClick={handleClose}
              variant="secondary"
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              loading={isLoading}
              disabled={!newUsername || !!error || newUsername === user.username}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            >
              {isLoading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}