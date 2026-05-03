// NPC Stable Detail - View stable info and horses with scouting
import { useParams, Link } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { getStableById } from "@/game/npcStables";
import { calculateScoutCost } from "@/game/scouting";
import type { Stable } from "@/game/types";
import { HorseCard } from "@/components/HorseCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Building2, Users, DollarSign, Globe, Trophy, Eye, Brain } from "lucide-react";
import { toast } from "sonner";
import { PERSONALITY_CONFIG } from "@/game/npcStables";

export default function NpcStableDetailPage() {
  const { stableId } = useParams({ from: "/npc-stables/$stableId" });
  const game = useGame();
  
  const stable = getStableById(game.npcStables, stableId);
  if (!stable) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Stable Not Found</h1>
        <Link to="/npc-stables" className="text-blue-600 hover:underline mt-4 inline-block">
          ← Back to Stables
        </Link>
      </div>
    );
  }
  
  const horses = game.horses.filter(h => h.stableId === stableId);
  const activeHorses = horses.filter(h => !h.healthStatus || h.healthStatus === "healthy");
  const colts = horses.filter(h => h.gender === "colt" || h.gender === "horse");
  const fillies = horses.filter(h => h.gender === "filly" || h.gender === "mare");
  
  const getTierColor = (tier: string) => {
    switch (tier) {
      case "elite": return "bg-purple-100 text-purple-800 border-purple-300";
      case "mid": return "bg-blue-100 text-blue-800 border-blue-300";
      case "budget": return "bg-green-100 text-green-800 border-green-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };
  
  const getReputationStars = (rep: number) => {
    const stars = Math.floor(rep / 20);
    return "★".repeat(stars) + "☆".repeat(5 - stars);
  };
  
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Back link */}
      <Link to="/npc-stables" className="text-blue-600 hover:underline mb-4 inline-flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" />
        Back to Stables
      </Link>
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start gap-4 mb-4">
          <div 
            className="w-16 h-16 rounded-full border-4 shadow-lg"
            style={{ 
              backgroundColor: stable.colors.primary,
              borderColor: stable.colors.secondary 
            }}
          />
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold">{stable.name}</h1>
              <Badge className={getTierColor(stable.tier)}>
                {stable.tier.toUpperCase()}
              </Badge>
            </div>
            <p className="text-gray-600 mt-1">{stable.owner}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Globe className="w-4 h-4" />
                {stable.country}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {horses.length} horses
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                ${stable.cash.toLocaleString()}
              </span>
              <span className="text-yellow-600">
                {getReputationStars(stable.reputation)}
              </span>
            </div>
          </div>
        </div>
        
        {stable.description && (
          <p className="text-gray-600 bg-gray-50 p-4 rounded-lg">
            {stable.description}
          </p>
        )}
        
        {/* Personality */}
        <div className="mt-4 flex items-center gap-3">
          <Badge variant="outline" className="flex items-center gap-1 px-3 py-1">
            <Brain className="w-3 h-3" />
            <span className="capitalize">{stable.personality.replace("-", " ")}</span>
          </Badge>
          <span className="text-sm text-gray-500">
            {PERSONALITY_CONFIG[stable.personality]?.description}
          </span>
          {stable.preferredDistance && (
            <Badge variant="secondary" className="text-xs">
              Specialist: {stable.preferredDistance}m {stable.preferredSurface}
            </Badge>
          )}
        </div>
      </div>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{horses.length}</div>
            <div className="text-sm text-gray-500">Total Horses</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{activeHorses.length}</div>
            <div className="text-sm text-gray-500">Active Horses</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{colts.length}</div>
            <div className="text-sm text-gray-500">Colts/Horses</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{fillies.length}</div>
            <div className="text-sm text-gray-500">Fillies/Mares</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Horses List */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Horses
        </h2>
        
        <div className="space-y-3">
          {horses.map(horse => {
            const scoutCost = calculateScoutCost(horse, stable!);
            const canScout = !horse.lastScoutedDay || (game.day - horse.lastScoutedDay) > 0;
            
            const handleScout = () => {
              const result = game.scoutHorse(horse.id);
              if (result.success) {
                toast.success(result.message);
              } else {
                toast.error(result.message);
              }
            };
            
            return (
              <div key={horse.id} className="relative">
                <HorseCard horse={horse} variant="scout" showScoutInfo />
                {canScout && (
                  <div className="absolute top-4 right-4">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handleScout}
                      disabled={game.cash < scoutCost}
                      className="flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      Scout ${scoutCost.toLocaleString()}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {horses.length === 0 && (
          <p className="text-gray-500 text-center py-8">
            No horses currently in this stable.
          </p>
        )}
      </div>
    </div>
  );
}
