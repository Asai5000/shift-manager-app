"use server";

import { db } from "@/db";
import { pmAssignments } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * Get PM assignments for a specific date range
 */
export async function getPMAssignments(startDate: string, endDate: string) {
    const assignments = await db.query.pmAssignments.findMany({
        where: and(
            gte(pmAssignments.date, startDate),
            lte(pmAssignments.date, endDate)
        )
    });

    const assignmentMap: Record<string, boolean> = {};
    for (const a of assignments) {
        assignmentMap[`${a.employeeId}-${a.date}`] = true;
    }

    return assignmentMap;
}

/**
 * Toggle a PM assignment on or off
 */
export async function togglePMAssignment(employeeId: number, dateStr: string, currentStatus: boolean) {
    if (!currentStatus) {
        // Turning ON
        const existing = await db.query.pmAssignments.findFirst({
            where: and(
                eq(pmAssignments.employeeId, employeeId),
                eq(pmAssignments.date, dateStr)
            )
        });

        if (!existing) {
            await db.insert(pmAssignments).values({
                employeeId,
                date: dateStr,
            });
        }
    } else {
        // Turning OFF
        await db.delete(pmAssignments).where(
            and(
                eq(pmAssignments.employeeId, employeeId),
                eq(pmAssignments.date, dateStr)
            )
        );
    }

    revalidatePath("/schedules/tasks-pm");
}
