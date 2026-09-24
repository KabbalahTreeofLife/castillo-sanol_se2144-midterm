import { useState } from "react";
import {useServices } from 
const [mode, setMode] = useState<'signin' | 'signup'>('signin');
const { login, register, loading, error } = useIncidents();

const handleSubmit = (e: FormEvent) => {
  e.preventDefault();
  if (mode === 'signin') void login(email, password);
  else void register(email, password);
};