'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { changePassword, type ChangePasswordState } from '@/actions/auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const initialState: ChangePasswordState = {
    message: '',
    errors: {},
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full md:w-auto">
            {pending ? '変更中...' : 'パスワードを変更する'}
        </Button>
    );
}

export function PasswordChangeForm() {
    const [state, formAction] = useActionState(changePassword, initialState);

    return (
        <form action={formAction} className="space-y-4 max-w-md">
            {state?.success && (
                <div className="bg-emerald-50 text-emerald-700 p-3 rounded-md text-sm border border-emerald-200">
                    {state.message}
                </div>
            )}

            {!state?.success && state?.message && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
                    {state.message}
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="currentPassword">現在のパスワード</Label>
                <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    required
                />
                {state?.errors?.currentPassword && (
                    <p className="text-sm text-red-500">{state.errors.currentPassword[0]}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="newPassword">新しいパスワード (4文字以上)</Label>
                <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    required
                    minLength={4}
                />
                {state?.errors?.newPassword && (
                    <p className="text-sm text-red-500">{state.errors.newPassword[0]}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="confirmPassword">新しいパスワード (確認用)</Label>
                <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={4}
                />
                {state?.errors?.confirmPassword && (
                    <p className="text-sm text-red-500">{state.errors.confirmPassword[0]}</p>
                )}
            </div>

            <div className="pt-2">
                <SubmitButton />
            </div>
        </form>
    );
}
