import React, { useState } from 'react';
import { Router, Wifi, Check, X, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { Dialog, DialogHeader, DialogContent, Button, Input, Label, Loader } from '../ui';

interface LoginModalProps {
  isOpen: boolean;
}

// Check if URL is a local IP address
const isLocalIpUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    // Check for common private IP patterns
    return /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|localhost|127\.)/.test(hostname);
  } catch {
    return false;
  }
};

// Extract IP from URL
const extractIpFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '192.168.1.254';
  }
};

// Detect if error is "app already authorized" or auth error type
const isAuthTokenError = (error: string | null): boolean => {
  if (!error) return false;
  const lowerError = error.toLowerCase();
  return lowerError.includes('already') ||
         lowerError.includes('déjà autorisé') ||
         lowerError.includes('already_authorized') ||
         lowerError.includes('app_token') ||
         lowerError.includes('invalid_token') ||
         lowerError.includes('auth') ||
         lowerError.includes('authentification');
};

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen }) => {
  const {
    isRegistered,
    isRegistering,
    isLoading,
    registrationStatus,
    error,
    freeboxUrl,
    register,
    login,
    setFreeboxUrl,
    clearError,
    resetToken
  } = useAuthStore();

  // Determine initial state based on saved URL
  const savedIsLocalIp = isLocalIpUrl(freeboxUrl);
  const [urlInput, setUrlInput] = useState(savedIsLocalIp ? 'https://mafreebox.freebox.fr' : freeboxUrl);
  const [useLocalIp, setUseLocalIp] = useState(savedIsLocalIp);
  const [localIp, setLocalIp] = useState(savedIsLocalIp ? extractIpFromUrl(freeboxUrl) : '192.168.1.254');
  const [isResetting, setIsResetting] = useState(false);

  const handleConnect = async () => {
    const url = useLocalIp ? `http://${localIp}` : urlInput;
    await setFreeboxUrl(url);

    if (isRegistered) {
      await login();
    } else {
      await register();
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    await resetToken();
    setIsResetting(false);
    // Clear error and allow user to re-register
    clearError();
  };

  const getStatusMessage = () => {
    switch (registrationStatus) {
      case 'pending':
        return 'Veuillez valider sur l\'écran de la Freebox...';
      case 'granted':
        return 'Autorisation accordée !';
      case 'denied':
        return 'Autorisation refusée';
      case 'timeout':
        return 'Délai dépassé';
      default:
        return '';
    }
  };

  const getStatusIcon = () => {
    switch (registrationStatus) {
      case 'pending':
        return <Loader size="md" className="text-primary" />;
      case 'granted':
        return <Check className="text-success" size={24} />;
      case 'denied':
      case 'timeout':
        return <X className="text-destructive" size={24} />;
      default:
        return null;
    }
  };

  const showResetButton = isAuthTokenError(error);

  return (
    <Dialog open={isOpen}>
      <DialogHeader
        title="Connexion Freebox"
        description={
          isRegistered
            ? 'Application enregistrée. Cliquez pour vous connecter.'
            : 'Enregistrez l\'application sur votre Freebox'
        }
        icon={<Router size={20} className="text-muted-foreground" />}
      />

      <DialogContent>
        {/* Error message with reset option */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle size={16} />
              <span className="flex-1">{error}</span>
              <button onClick={clearError} className="rounded p-1 transition-colors hover:bg-destructive/10">
                <X size={16} />
              </button>
            </div>
            {showResetButton && (
              <div className="mt-3 border-t border-destructive/30 pt-3">
                <p className="mb-2 text-xs text-muted-foreground">
                  Le token d'authentification semble invalide ou l'application est déjà enregistrée sur la Freebox mais pas sur ce serveur.
                </p>
                <Button
                  onClick={handleReset}
                  disabled={isResetting}
                  variant="danger"
                  className="w-full justify-center"
                >
                  {isResetting ? <Loader size="sm" /> : <RefreshCw size={14} />}
                  Réinitialiser et ré-enregistrer
                </Button>
              </div>
            )}
          </div>
        )}

        {/* URL Selection */}
        <div className="space-y-3">
          <Label>Adresse de la Freebox</Label>

          {/* Tabs for URL type */}
          <div className="flex gap-2">
            <Button
              onClick={() => setUseLocalIp(false)}
              variant={!useLocalIp ? 'primary' : 'default'}
              size="md"
              icon={Wifi}
              className="flex-1 justify-center"
            >
              mafreebox.freebox.fr
            </Button>
            <Button
              onClick={() => setUseLocalIp(true)}
              variant={useLocalIp ? 'primary' : 'default'}
              size="md"
              className="flex-1 justify-center"
            >
              IP Locale
            </Button>
          </div>

          {/* URL/IP Input */}
          {useLocalIp ? (
            <Input
              type="text"
              value={localIp}
              onChange={(e) => setLocalIp(e.target.value)}
              placeholder="192.168.1.254"
            />
          ) : (
            <Input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://mafreebox.freebox.fr"
            />
          )}
        </div>

        {/* Registration status */}
        {isRegistering && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-secondary/60 p-4">
            {getStatusIcon()}
            <p className="text-center text-sm text-foreground">{getStatusMessage()}</p>
            {registrationStatus === 'pending' && (
              <p className="text-center text-xs text-muted-foreground">
                Un message apparaît sur l'écran LCD de votre Freebox.
                <br />
                Utilisez les flèches pour sélectionner "Oui" et valider.
              </p>
            )}
          </div>
        )}

        {/* Connect button */}
        <Button
          onClick={handleConnect}
          disabled={(isRegistering && registrationStatus === 'pending') || isLoading || isResetting}
          variant="primary"
          size="md"
          className="w-full justify-center"
        >
          {isLoading ? (
            <>
              <Loader size="sm" />
              Connexion...
            </>
          ) : isRegistering && registrationStatus === 'pending' ? (
            <>
              <Loader size="sm" />
              En attente de validation...
            </>
          ) : isRegistered ? (
            'Se connecter'
          ) : (
            'Enregistrer l\'application'
          )}
        </Button>

        {/* Help text */}
        <p className="text-center text-xs text-muted-foreground">
          {isRegistered
            ? 'L\'application est déjà autorisée sur votre Freebox.'
            : 'Cette opération ne doit être effectuée qu\'une seule fois.'}
        </p>
      </DialogContent>
    </Dialog>
  );
};
