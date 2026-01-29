"use client";

import { useRouter } from 'next/navigation';
import api from '../utils/api';
// import { Lock } from 'lucide-react';
import Image from 'next/image';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import logo from '../../images/astraea_logo.svg';

export default function LoginPage() {
    const router = useRouter();

    const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
        try {
            if (!credentialResponse.credential) {
                console.error('No credential received');
                return;
            }

            // Send the Google token to our backend
            const res = await api.post('/auth/google', {
                token: credentialResponse.credential
            });

            // Store the JWT token
            localStorage.setItem('token', res.data.access_token);

            // Redirect to home
            router.push('/');
        } catch (err: any) {
            console.error('Login error detail:', err.response?.data || err.message || err);
            const errorMsg = err.response?.data?.detail || 'Authentication failed. Please try again.';
            alert(errorMsg);
        }
    };

    const handleGoogleError = () => {
        console.error('Google Sign-In failed');
        alert('Google Sign-In failed. Please try again.');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800 via-gray-950 to-black text-white p-4">
            <div className="w-full max-w-md bg-gray-900/50 backdrop-blur-xl border border-gray-800 p-8 rounded-2xl shadow-2xl">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-300 h-300 rounded-full text-blue-400 mb-4">
                        <Image
                            src={logo}
                            alt="Astraea Logo"
                            className='w-36 h-36 object-contain'
                        />
                    </div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                        Welcome to Astraea
                    </h1>
                    <p className="text-gray-400 text-sm mt-2">
                        Sign in with your Google account to continue
                    </p>
                </div>

                <div className="flex justify-center">
                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={handleGoogleError}
                        useOneTap
                        theme="outline"
                        size="large"
                        text="signin_with"
                        shape="rectangular"
                    />
                </div>

                <div className="mt-6 text-center text-xs text-gray-500">
                    By signing in, you agree to our Terms of Service and Privacy Policy
                </div>
            </div>
        </div>
    );
}
