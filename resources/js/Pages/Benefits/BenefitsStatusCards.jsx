import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
    FileText, 
    Check, 
    AlertCircle 
} from 'lucide-react';

const StatusCard = ({ title, count, icon, bgColor, textColor }) => (
    <Card className={`${bgColor} shadow-sm`}>
        <CardContent className="p-6 flex justify-between items-center">
            <div>
                <p className={`text-sm font-medium ${textColor}`}>{title}</p>
                <p className="text-2xl font-bold">{count}</p>
            </div>
            <div className={`p-3 rounded-full ${bgColor.replace("bg-", "bg-opacity-20")}`}>
                {icon}
            </div>
        </CardContent>
    </Card>
);

const BenefitsStatusCards = ({ total, posted, pending }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatusCard 
                title="Total Benefits" 
                count={total}
                icon={<FileText className="h-6 w-6 text-indigo-600" />}
                bgColor="bg-white"
                textColor="text-gray-600"
            />
            <StatusCard 
                title="Posted Benefits" 
                count={posted}
                icon={<Check className="h-6 w-6 text-green-600" />}
                bgColor="bg-white" 
                textColor="text-gray-600"
            />
            <StatusCard 
                title="Pending Benefits" 
                count={pending}
                icon={<AlertCircle className="h-6 w-6 text-yellow-600" />}
                bgColor="bg-white"
                textColor="text-gray-600"
            />
        </div>
    );
};

export default BenefitsStatusCards;