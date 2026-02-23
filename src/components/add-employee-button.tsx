'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { EmployeeForm } from '@/components/employee-form';
import { Plus } from 'lucide-react';

export function AddEmployeeButton() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Button onClick={() => setIsOpen(true)}>
                <Plus className="w-5 h-5 mr-2" />
                従業員を追加
            </Button>

            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title="従業員の追加"
            >
                <EmployeeForm onSuccess={() => setIsOpen(false)} />
            </Modal>
        </>
    );
}
