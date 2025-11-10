
"use client";

import React, { useState, useCallback, useRef } from 'react';
import { FormData, CalculationResult } from '../../types';
import { getTravelAdvice } from '../../services/geminiService';
import { MapPin, Loader2, TrendingDown, Lightbulb, Car, Bus, Bike, Zap, Plane } from '../../components/icons';
import MapComponent, { MapComponentHandles } from '../../components/MapComponent';
import ErrorBoundary from '../../components/ErrorBoundary';

const DashboardPageClient: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    start_location: "",
    destination: "",
    transport_mode: "car",
    electricity_kwh: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const mapComponentRef = useRef<MapComponentHandles>(null);


  const handleRouteCalculated = useCallback((details: { distance: number; startAddress: string; endAddress: string }) => {
    setDistance(details.distance);
    setFormData(prev => ({
      ...prev,
      start_location: details.startAddress,
      destination: details.endAddress,
    }));
    setError(null); 
  }, []);
  
  const handleLocationError = useCallback((message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
     if (distance === null || distance <= 0) {
      setError("Please select a valid route on the map to calculate the distance.");
      return;
    }
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const apiResult = await getTravelAdvice(formData, distance);
      setResult(apiResult);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setLoading(false);
    }
  }, [formData, distance]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFindRouteClick = () => {
    if (formData.start_location && formData.destination) {
      mapComponentRef.current?.findRouteFromAddresses(
        formData.start_location,
        formData.destination
      );
    }
  };

  return (
    <div className="min-h-screen bg-secondary/50">
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <MapPin className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">EcoRoute AI</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4 md:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Your Green Travel Dashboard</h1>
            <p className="mt-2 text-lg text-muted-foreground">Calculate route emissions and get AI-powered tips for sustainable travel.</p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <div className="bg-background p-6 rounded-lg shadow-sm border">
              <h2 className="text-xl font-bold">Enter Route & Vehicle Data</h2>
              <p className="text-muted-foreground mb-6">Define your route on the map below, or type addresses.</p>
              <form onSubmit={handleSubmit} className="space-y-6">
                
                <ErrorBoundary fallback={
                  <div className="p-4 bg-destructive/20 text-destructive border border-destructive rounded-md">
                    <h3 className="font-semibold">Map Error</h3>
                    <p className="text-sm mt-1">Unable to load the map. Please check your Google Maps API key.</p>
                  </div>
                }>
                  <MapComponent ref={mapComponentRef} onRouteCalculated={handleRouteCalculated} onLocationError={handleLocationError} />
                </ErrorBoundary>

                <div className="space-y-2">
                  <label htmlFor="start_location" className="font-medium">Start Location</label>
                  <input
                    id="start_location"
                    name="start_location"
                    type="text"
                    placeholder="Type an address"
                    value={formData.start_location}
                    onChange={handleInputChange}
                    required
                    className="w-full p-2 border border-input rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="destination" className="font-medium">Destination</label>
                  <input
                    id="destination"
                    name="destination"
                    type="text"
                    placeholder="Type an address"
                    value={formData.destination}
                    onChange={handleInputChange}
                    required
                    className="w-full p-2 border border-input rounded-md"
                  />
                </div>
                 <button
                  type="button"
                  onClick={handleFindRouteClick}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 border rounded-md text-sm font-medium hover:bg-secondary disabled:opacity-50"
                  disabled={!formData.start_location || !formData.destination}
                >
                  <MapPin className="h-4 w-4" />
                  Find Route on Map
                </button>
                <div className="space-y-2">
                  <label htmlFor="transport_mode" className="font-medium">Transport Mode</label>
                  <select
                    id="transport_mode"
                    name="transport_mode"
                    value={formData.transport_mode}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-input rounded-md appearance-none bg-white bg-no-repeat"
                    style={{backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em'}}
                  >
                    <option value="car">Car</option>
                    <option value="bus">Bus</option>
                    <option value="bike">Bike</option>
                    <option value="plane">Plane</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="electricity_kwh" className="font-medium">Electricity Used (kWh, Optional)</label>
                  <input
                    id="electricity_kwh"
                    name="electricity_kwh"
                    type="number"
                    step="0.1"
                    placeholder="e.g., 15.5 for your EV"
                    value={formData.electricity_kwh}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-input rounded-md"
                  />
                </div>
                <button type="submit" className="w-full bg-primary text-primary-foreground font-semibold py-3 px-4 rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center" disabled={loading || !distance}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    "Calculate Travel Impact"
                  )}
                </button>
              </form>
            </div>

            <div className="space-y-6">
              {error && <div className="p-4 bg-destructive/20 text-destructive border border-destructive rounded-md">{error}</div>}
              {result ? (
                <>
                  <div className="bg-background p-6 rounded-lg shadow-sm border">
                    <h3 className="flex items-center gap-2 font-bold text-lg">
                      <TrendingDown className="h-5 w-5 text-primary" />
                      Your Travel Carbon Footprint
                    </h3>
                    <p className="text-muted-foreground">{result.distance_km.toFixed(1)} km via {formData.transport_mode}</p>
                    <div className="text-center py-6">
                      <div className="text-5xl font-bold text-primary mb-2">{result.total_co2}</div>
                      <div className="text-lg text-muted-foreground">kg CO₂ for this trip</div>
                       <p className="text-sm mt-2 text-muted-foreground">{result.summary}</p>
                    </div>
                    
                    <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Breakdown</h4>
                        {result.route_co2 > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                {formData.transport_mode === "car" && <Car className="h-4 w-4" />}
                                {formData.transport_mode === "bus" && <Bus className="h-4 w-4" />}
                                {formData.transport_mode === "bike" && <Bike className="h-4 w-4" />}
                                {formData.transport_mode === "plane" && <Plane className="h-4 w-4" />}
                                <span className="font-medium capitalize">Route ({formData.transport_mode})</span>
                              </div>
                              <span className="font-semibold">{result.route_co2} kg</span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${result.total_co2 > 0 ? (result.route_co2 / result.total_co2) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {result.electric_co2 > 0 && (
                           <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-accent" />
                                <span className="font-medium">Electric Car</span>
                              </div>
                              <span className="font-semibold">{result.electric_co2} kg</span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-accent rounded-full transition-all"
                                style={{ width: `${result.total_co2 > 0 ? (result.electric_co2 / result.total_co2) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                  <div className="bg-background p-6 rounded-lg shadow-sm border">
                     <h3 className="flex items-center gap-2 font-bold text-lg">
                      <Lightbulb className="h-5 w-5 text-accent" />
                      AI Green Travel Tips
                    </h3>
                     <p className="text-muted-foreground mb-4">Personalized suggestions for sustainable travel</p>
                    <ul className="space-y-3">
                      {result.advice.map((tip, index) => (
                        <li key={index} className="flex gap-3 items-start">
                          <div className="flex-shrink-0 mt-1 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                            {index + 1}
                          </div>
                          <p className="text-sm leading-relaxed">{tip}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : !loading && (
                <div className="bg-background border-2 border-dashed rounded-lg">
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                      <MapPin className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Ready to Calculate</h3>
                    <p className="text-muted-foreground max-w-sm">
                      Select your route on the map to calculate your travel carbon footprint and get AI-powered green alternatives.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPageClient;