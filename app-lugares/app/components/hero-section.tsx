"use client";

import { Utensils, Star, MapPin, Tag } from "lucide-react";
import { Restaurant } from "@/app/types/restaurant";

interface HeroSectionProps {
  restaurants: Restaurant[];
}

export default function HeroSection({ restaurants }: HeroSectionProps) {
  const totalRestaurants = restaurants.length;
  const avgRating =
    totalRestaurants > 0
      ? (
          restaurants.reduce((sum, r) => sum + r.rating, 0) / totalRestaurants
        ).toFixed(1)
      : "0";
  const uniqueCategories = new Set(restaurants.map((r) => r.categoría)).size;
  const uniqueLocalities = new Set(restaurants.map((r) => r.localidad)).size;

  const stats = [
    {
      icon: Utensils,
      label: "Restaurantes",
      value: totalRestaurants.toString(),
      color: "text-[var(--accent-light)]",
    },
    {
      icon: Star,
      label: "Rating Promedio",
      value: avgRating,
      color: "text-[var(--warning)]",
    },
    {
      icon: Tag,
      label: "Categorías",
      value: uniqueCategories.toString(),
      color: "text-[var(--success)]",
    },
    {
      icon: MapPin,
      label: "Localidades",
      value: uniqueLocalities.toString(),
      color: "text-[var(--info)]",
    },
  ];

  return (
    <section className="animate-fadeIn">
      {/* Title */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
          <span className="gradient-text">Gastro</span>{" "}
          <span className="text-[var(--text-primary)]">Tucumán</span>
        </h1>
        <p className="text-[var(--text-secondary)] text-lg max-w-xl leading-relaxed mx-auto">
          Panel de administración para la base de datos de restaurantes de
          Tucumán. Visualiza, edita y gestiona los establecimientos.
        </p>
      </div>

      {/* Gradient Divider */}
      <div className="gradient-divider mt-10" />
    </section>
  );
}
