import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { LogOut, Car, Bike, ArrowRightLeft, Clock, DollarSign, CheckCircle } from 'lucide-react';

/**
 * Componente Dashboard (Panel de Control).
 * Centraliza las operaciones diarias del parqueadero: registro de entrada,
 * salida de vehículos y visualización de cobros en tiempo real.
 */
const Dashboard = () => {
    const { user, logout } = useAuth();
    const [plate, setPlate] = useState('');
    const [vehicleType, setVehicleType] = useState('CAR');
    const [parkings, setParkings] = useState<any[]>([]);
    const [selectedParkingId, setSelectedParkingId] = useState('');
    const [message, setMessage] = useState({ text: '', type: '' });
    const [lastExit, setLastExit] = useState<any>(null);

    useEffect(() => {
        const fetchParkings = async () => {
            try {
                const res = await api.get('/parking');
                setParkings(res.data);
                if (res.data.length > 0) setSelectedParkingId(res.data[0].id);
            } catch (err) {
                console.error("Error fetching parkings", err);
            }
        };
        fetchParkings();
    }, []);

    const handleEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage({ text: '', type: '' });
        try {
            await api.post('/parking/entry', { placa: plate, vehicleType, parkingId: selectedParkingId });
            setMessage({ text: `Ingreso registrado para placa ${plate}`, type: 'success' });
            setPlate('');
        } catch (err: any) {
            setMessage({ text: err.response?.data?.message || 'Error al registrar ingreso', type: 'error' });
        }
    };

    const handleExit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage({ text: '', type: '' });
        setLastExit(null);
        try {
            const res = await api.post('/parking/exit', { placa: plate });
            setMessage({ text: 'Salida procesada con éxito', type: 'success' });
            setLastExit(res.data);
            setPlate('');
        } catch (err: any) {
            setMessage({ text: err.response?.data?.message || 'Error al registrar salida', type: 'error' });
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-indigo-700 text-white p-4 shadow-lg flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <ArrowRightLeft size={24} />
                    <h1 className="text-xl font-bold">RM Parking - Control de Acceso</h1>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">Operario: {user?.fullName}</span>
                    <button onClick={logout} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
                {/* Status Messages */}
                {message.text && (
                    <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {message.type === 'success' ? <CheckCircle size={20} /> : null}
                        {message.text}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Entry Form */}
                    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                        <div className="flex items-center gap-2 mb-4 text-indigo-700">
                            <Car size={24} />
                            <h2 className="text-lg font-bold">Registro de Ingreso</h2>
                        </div>
                        <form onSubmit={handleEntry} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Placa</label>
                                <input
                                    type="text"
                                    value={plate}
                                    onChange={(e) => setPlate(e.target.value.toUpperCase())}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    placeholder="ABC123"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Vehículo</label>
                                <div className="flex gap-4">
                                    <label className="flex-1 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="vtype"
                                            value="CAR"
                                            checked={vehicleType === 'CAR'}
                                            onChange={() => setVehicleType('CAR')}
                                            className="sr-only peer"
                                        />
                                        <div className="p-3 text-center border rounded-lg peer-checked:bg-indigo-50 peer-checked:border-indigo-500 peer-checked:text-indigo-700 transition-all">
                                            Carro
                                        </div>
                                    </label>
                                    <label className="flex-1 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="vtype"
                                            value="MOTORCYCLE"
                                            checked={vehicleType === 'MOTORCYCLE'}
                                            onChange={() => setVehicleType('MOTORCYCLE')}
                                            className="sr-only peer"
                                        />
                                        <div className="p-3 text-center border rounded-lg peer-checked:bg-indigo-50 peer-checked:border-indigo-500 peer-checked:text-indigo-700 transition-all">
                                            Moto
                                        </div>
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Parqueadero</label>
                                <select
                                    value={selectedParkingId}
                                    onChange={(e) => setSelectedParkingId(e.target.value)}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                >
                                    {parkings.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors">
                                Registrar Entrada
                            </button>
                        </form>
                    </div>

                    {/* Exit Form */}
                    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                        <div className="flex items-center gap-2 mb-4 text-emerald-600">
                            <Clock size={24} />
                            <h2 className="text-lg font-bold">Registro de Salida</h2>
                        </div>
                        <form onSubmit={handleExit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Buscar por Placa</label>
                                <input
                                    type="text"
                                    value={plate}
                                    onChange={(e) => setPlate(e.target.value.toUpperCase())}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                    placeholder="ABC123"
                                    required
                                />
                            </div>
                            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-colors">
                                Registrar Salida
                            </button>
                        </form>

                        {/* Last Exit Summary */}
                        {lastExit && (
                            <div className="mt-6 p-4 bg-emerald-50 rounded-lg border border-emerald-100 space-y-2 animate-in fade-in slide-in-from-top-4">
                                <h3 className="font-bold text-emerald-800 flex items-center gap-2">
                                    <DollarSign size={18} /> Resumen de Cobro
                                </h3>
                                <div className="grid grid-cols-2 text-sm text-emerald-900">
                                    <span>Duración:</span>
                                    <span className="font-medium">{lastExit.exit.durationMinutes} min</span>
                                    <span>Monto Total:</span>
                                    <span className="font-bold text-lg">${lastExit.exit.totalAmount}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
