import { useState, useCallback } from 'react';
import { ethers } from 'ethers';

export function useWallet() {
    const [account, setAccount] = useState(null);
    const [provider, setProvider] = useState(null);
    const [balance, setBalance] = useState('0');

    const connectWallet = useCallback(async () => {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                const _provider = new ethers.BrowserProvider(window.ethereum);
                setAccount(accounts[0]);
                setProvider(_provider);

                const bal = await _provider.getBalance(accounts[0]);
                setBalance(ethers.formatEther(bal));

                return { account: accounts[0], provider: _provider };
            } catch (err) {
                console.error(err);
                alert('Connection failed: ' + err.message);
                throw err;
            }
        } else {
            alert('Please install Metamask!');
        }
    }, []);

    const sendTransaction = useCallback(async (to, amountEth) => {
        if (!provider) throw new Error("Wallet not connected");
        try {
            const signer = await provider.getSigner();
            const tx = await signer.sendTransaction({
                to: to,
                value: ethers.parseEther(amountEth)
            });
            return tx;
        } catch (err) {
            console.error(err);
            throw err;
        }
    }, [provider]);

    return { account, balance, connectWallet, sendTransaction, isConnected: !!account };
}
