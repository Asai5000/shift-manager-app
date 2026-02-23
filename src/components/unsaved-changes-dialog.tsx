'use client';

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useUnsavedChanges } from "@/components/providers/unsaved-changes-provider";

export function UnsavedChangesDialog() {
    const { isModalOpen, confirmNavigation, cancelNavigation } = useUnsavedChanges();

    return (
        <Modal
            isOpen={isModalOpen}
            onClose={cancelNavigation}
            title="変更が保存されていません"
            description="このページを離れると、保存されていない変更は破棄されます。移動してもよろしいですか？"
        >
            <div className="flex w-full items-center justify-end space-x-2 pt-6">
                <Button variant="outline" onClick={cancelNavigation}>
                    キャンセル
                </Button>
                <Button variant="destructive" onClick={confirmNavigation}>
                    破棄して移動
                </Button>
            </div>
        </Modal>
    );
}
