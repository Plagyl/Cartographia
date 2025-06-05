
import { InfrastructureTypes, AttackType } from './types';

export const INFRASTRUCTURE_TYPES: InfrastructureTypes = {
    0: { 
        names: ["SA 1", "SA 2", "SA 3", "SA 4", "SA 5", "SA 6", "SA 7", "SA 8"],
        type: "site",
        color: "#ff6b6b" // text-red-400
    },
    1: { 
        names: ["DMZ", "LAN Corporate", "Datacenter", "Zone Admin", "Zone Dev", "Zone Prod", "WiFi Guest", "VPN", "Cloud AWS", "Cloud Azure", "Backup Site", "DR Site"],
        type: "zone",
        color: "#4a9eff" // text-blue-500
    },
    2: { 
        names: ["Services Web", "Base de Données", "Messagerie", "Active Directory", "Pare-feu", "Load Balancer", "Monitoring", "Backup", "Antivirus", "SIEM", "Proxy", "DNS", "DHCP", "File Server", "Print Server"],
        type: "service",
        color: "#51cf66" // text-green-500
    },
    3: { 
        names: ["SRV-WEB", "SRV-DB", "SRV-APP", "SRV-MAIL", "FW", "RTR", "SW", "SRV-FILE", "SRV-PRINT", "SRV-BACKUP", "VM", "CONTAINER", "SRV-LOG", "SRV-MON", "NAS"],
        type: "server",
        color: "#ffd93d" // text-yellow-400
    },
    4: { 
        names: ["Apache", "Nginx", "MySQL", "PostgreSQL", "Exchange", "Outlook", "SharePoint", "SAP", "CRM", "ERP", "Jenkins", "GitLab", "Docker", "Kubernetes", "Elasticsearch"],
        type: "application",
        color: "#ff9ff3" // text-pink-400
    }
};

export const ATTACK_TYPES: AttackType[] = [
    { 
        name: "Ransomware", 
        severity: "Critique", 
        spread: 0.7,
        vector: "Email de phishing",
        impacts: ["Chiffrement des données", "Interruption de service", "Demande de rançon"]
    },
    { 
        name: "DDoS Distribué", 
        severity: "Élevée", 
        spread: 0.5,
        vector: "Botnet externe",
        impacts: ["Saturation réseau", "Indisponibilité services", "Dégradation performances"]
    },
    { 
        name: "APT (Advanced Persistent Threat)", 
        severity: "Critique", 
        spread: 0.8,
        vector: "Compromission supply chain",
        impacts: ["Exfiltration données", "Backdoor installée", "Mouvement latéral"]
    },
    { 
        name: "Malware Polymorphe", 
        severity: "Élevée", 
        spread: 0.6,
        vector: "USB infectée",
        impacts: ["Propagation réseau", "Vol credentials", "Keylogging actif"]
    },
    { 
        name: "Zero-Day Exploit", 
        severity: "Critique", 
        spread: 0.9,
        vector: "Vulnérabilité non patchée",
        impacts: ["Élévation privilèges", "Exécution code arbitraire", "Contournement sécurité"]
    }
];

export const ROOT_NODE_ID = 'root';
export const ROOT_NODE_NAME = 'Groupe Corporate';