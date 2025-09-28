"use client";
import { Wallet, LogOut, Copy, Check } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useLogin, useLogout } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import React, { useState } from 'react';


export default function ConnectedLogoutUI() {
  const { address } = useAccount();
  const { login } = useLogin();
  const { logout } = useLogout();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const handleCopyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // If not connected, show Connect Wallet button
  if (!address) {
    return (
      <Button
        variant="default"
        onClick={async () => {
          setLogoutError(null);
          try {
            await login();
          } catch (err: any) {
            setLogoutError('Wallet connection failed.');
            console.error('Login error:', err);
          }
        }}
        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow hover:from-purple-700 hover:to-blue-700"
      >
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </Button>
    );
  }

  // If connected, show wallet info and logout
  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 bg-white rounded-lg p-2 border shadow-sm w-full sm:w-auto">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-sm font-medium"></span>
      </div>
      <div className="flex items-center gap-2 ml-3 pl-3 border-l">
        <Wallet className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-mono">{formatAddress(address)}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopyAddress}
          className="h-6 w-6 p-0 hover:bg-gray-100"
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
      <Button
        variant="outline"
        onClick={async () => {
          setLogoutError(null);
          try {
            await logout();
          } catch (err: any) {
            setLogoutError('Logout failed, but your session has been cleared locally.');
            console.error('Logout error:', err);
          }
        }}
        className="flex items-center gap-2 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
      >
        <LogOut className="h-4 w-4" />
      </Button>
      {logoutError && (
        <div className="text-red-600 text-xs mt-1">{logoutError}</div>
      )}
    </div>
  );
