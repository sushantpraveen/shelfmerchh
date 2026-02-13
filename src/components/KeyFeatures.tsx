import {
    Users,
    Layers,
    Star,
    Ruler,
    Check,
    Droplets,
    Shield,
    Heart,
    Shirt,
    Tag,
    Box,
    Maximize,
    Flame,
    Recycle,
    Smartphone,
    Monitor,
    Gem,
    Scissors,
    Briefcase,
    Feather,
    Zap,
    Anchor
} from "lucide-react";
import { LucideIcon } from "lucide-react";
import visorIcon from "@/assets/visor-icon.png";

interface KeyFeaturesProps {
    attributes?: Record<string, any>;
}

const ATTRIBUTE_CONFIG: Record<string, { icon?: LucideIcon; img?: string; label: string }> = {
    // Apparel
    gender: { icon: Users, label: "Target Audience" },
    material: { icon: Layers, label: "Material" },
    gsm: { icon: Feather, label: "Fabric Weight" },
    fit: { icon: Shirt, label: "Fit Type" },
    brand: { icon: Tag, label: "Brand" },
    fabricComposition: { icon: Layers, label: "Composition" },
    collarType: { icon: Scissors, label: "Collar Style" },
    sleeveLength: { icon: Ruler, label: "Sleeve Length" },
    neckline: { icon: Scissors, label: "Neckline" },
    hoodType: { icon: Shirt, label: "Hood Style" },
    pocketStyle: { icon: Briefcase, label: "Pocket Style" },

    // Accessories
    capacity: { icon: Box, label: "Capacity" },
    handleType: { icon: Anchor, label: "Handle Type" },
    capStyle: { icon: Star, label: "Cap Style" },
    visorType: { img: visorIcon, label: "Visor Type" },
    compatibility: { icon: Smartphone, label: "Compatibility" },
    caseType: { icon: Shield, label: "Case Type" },
    protection: { icon: Shield, label: "Protection Level" },

    // Home
    dishwasherSafe: { icon: Droplets, label: "Dishwasher Safe" },
    microwaveSafe: { icon: Flame, label: "Microwave Safe" },
    dimensions: { icon: Maximize, label: "Dimensions" },
    fillMaterial: { icon: Layers, label: "Fill Material" },
    frameSize: { icon: Maximize, label: "Frame Size" },
    frameMaterial: { icon: Layers, label: "Frame Material" },

    // Print
    paperType: { icon: Layers, label: "Paper Type" },
    paperWeight: { icon: Feather, label: "Paper Weight" },
    finish: { icon: Star, label: "Finish" },
    corners: { icon: Scissors, label: "Corners" },
    waterproof: { icon: Droplets, label: "Waterproof" },
    binding: { icon: Briefcase, label: "Binding" },

    // Packaging
    recyclable: { icon: Recycle, label: "Recyclable" },
    boxType: { icon: Box, label: "Box Type" },

    // Tech
    model: { icon: Smartphone, label: "Model" },
    accessoryType: { icon: Monitor, label: "Accessory Type" },

    // Jewelry
    hypoallergenic: { icon: Heart, label: "Hypoallergenic" },
    ringSize: { icon: Ruler, label: "Ring Size" },
    chainType: { icon: Anchor, label: "Chain Type" },
    claspType: { icon: Anchor, label: "Clasp Type" },
    earringType: { icon: Gem, label: "Earring Style" },
};

// Helper to format values (e.g., boolean to Yes/No, add units if needed)
const formatValue = (key: string, value: any): string => {
    if (value === true) return "Yes";
    if (value === false) return "No";
    if (key === 'gsm') return `${value} GSM`;
    if (key === 'weight') return `${value}g`;
    if (key === 'capacity' && typeof value === 'number') return `${value}L`;
    return String(value);
};

export const KeyFeatures = ({ attributes }: KeyFeaturesProps) => {
    // If no attributes provided or empty object, don't render anything
    if (!attributes || Object.keys(attributes).length === 0) {
        return null;
    }

    // Filter out empty values and map to config
    const features = Object.entries(attributes)
        .filter(([_, value]) => value !== null && value !== "" && value !== undefined)
        .map(([key, value]) => {
            const config = ATTRIBUTE_CONFIG[key] || { icon: Check, label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1') };
            return {
                key,
                icon: config.icon,
                img: config.img,
                title: config.label,
                description: formatValue(key, value) // User requested: "Attribute value as the card description"
            };
        });

    if (features.length === 0) return null;

    return (
        <section className="space-y-6">
            <h2 className="section-title">Key Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {features.map((feature) => (
                    <div
                        key={feature.key}
                        className="bg-card rounded-2xl p-6 border border-border/50 flex flex-col items-start gap-4 hover:shadow-lg transition-shadow duration-300"
                    >
                        {feature.img ? (
                            <img src={feature.img} alt={feature.title} className="w-8 h-8 object-contain" />
                        ) : (
                            feature.icon && <feature.icon className="w-6 h-6 text-black flex-shrink-0" strokeWidth={2.0} />
                        )}
                        <div className="space-y-2">
                            <h3 className="text-lg font-semibold text-foreground">
                                {feature.title}
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

