"use client";

import { useEffect, useState } from "react";
import { Linkedin, Twitter } from "lucide-react";
import Container from "../layout/Container";
import Card from "../ui/Card";

interface TeamMember {
  name: string;
  role: string;
  bio: string;
  image?: string;
  linkedin?: string;
  twitter?: string;
}

const teamMembers: TeamMember[] = [
  {
    name: "Amadou Diallo",
    role: "CEO & Co-fondateur",
    bio: "10 ans d'experience en fintech. Ex-responsable produit chez Orange Money.",
    linkedin: "#",
    twitter: "#",
  },
  {
    name: "Fatou Sow",
    role: "CTO & Co-fondatrice",
    bio: "Ingenieure logiciel senior. Ex-Google, specialiste des systemes distribues.",
    linkedin: "#",
    twitter: "#",
  },
  {
    name: "Ibrahim Kone",
    role: "COO",
    bio: "MBA Harvard. 8 ans d'experience en operations et strategie en Afrique de l'Ouest.",
    linkedin: "#",
  },
  {
    name: "Aissatou Barry",
    role: "Head of Product",
    bio: "Designer produit passionnee. Ex-Jumia, experte UX pour marches emergents.",
    linkedin: "#",
    twitter: "#",
  },
];

export default function Team() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section id="team" className="py-20 md:py-32 bg-white">
      <Container>
        {/* Section Header */}
        <div
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="font-serif text-3xl md:text-5xl font-bold text-gray-900 mb-4">
            Notre Equipe
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Une equipe passionnee, combinant expertise technologique et connaissance
            approfondie du marche africain.
          </p>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {teamMembers.map((member, index) => (
            <div
              key={index}
              className={`transition-all duration-700 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <Card variant="bordered" hover className="text-center p-6 h-full">
                {/* Avatar */}
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                  <span className="text-3xl font-bold text-gray-500">
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                </div>

                {/* Info */}
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {member.name}
                </h3>
                <p className="text-emerald-600 font-medium text-sm mb-3">
                  {member.role}
                </p>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">
                  {member.bio}
                </p>

                {/* Social Links */}
                <div className="flex items-center justify-center gap-3">
                  {member.linkedin && (
                    <a
                      href={member.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
                    >
                      <Linkedin size={16} />
                    </a>
                  )}
                  {member.twitter && (
                    <a
                      href={member.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors"
                    >
                      <Twitter size={16} />
                    </a>
                  )}
                </div>
              </Card>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
