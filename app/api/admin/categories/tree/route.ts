// /api/admin/categories/tree/route.ts

import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";

import {
    getCategoryChildren,
} from "@/lib/queries/category";

import {
    getBoardTreeNodes,
} from "@/lib/queries/boards";

import {
    getSubjectTreeNodes,
} from "@/lib/queries/subjects";

export async function GET(req: Request) {
    try {
        await requireAdmin(req);

        const url = new URL(req.url);

        const type = url.searchParams.get("type") || "category";

        // CATEGORY
        if (type === "category") {
            const parentIdParam =
                url.searchParams.get("parentId");

            let parentId: number | null = null;

            if (
                parentIdParam &&
                parentIdParam !== "null"
            ) {
                parentId = parseInt(parentIdParam, 10);
            }

            const data =
                await getCategoryChildren(db, parentId);

            return NextResponse.json({
                data: data.map((item) => ({
                    ...item,
                    type: "category",
                    parentName: item.parent_name ?? undefined,
                    children: [],
                    hasChildren: item.has_children,
                })),
            });
        }

        // BOARD
        if (type === "board") {
            const categoryId = Number(
                url.searchParams.get("categoryId")
            );

            const data =
                await getBoardTreeNodes(
                    db,
                    categoryId
                );

            return NextResponse.json({
                data: data.map((item) => ({
                    ...item,
                    type: "board",
                    depth: 3,
                    categoryId,
                    parentName: item.parent_name ?? undefined,
                    children: [],
                    hasChildren: item.has_children,
                })),
            });
        }

        // SUBJECT
        if (type === "subject") {
            const categoryId = Number(
                url.searchParams.get("categoryId")
            );

            const boardId = Number(
                url.searchParams.get("boardId")
            );

            const data =
                await getSubjectTreeNodes(
                    db,
                    categoryId,
                    boardId
                );

            return NextResponse.json({
                data: data.map((item) => ({
                    ...item,
                    type: "subject",
                    depth: 4,
                    categoryId,
                    boardId,
                    parentName: item.parent_name ?? undefined,
                    boardName: item.board_name ?? undefined,
                    children: [],
                    hasChildren: false,
                })),
            });
        }

        return NextResponse.json(
            { error: "Invalid type" },
            { status: 400 }
        );
    } catch (err: any) {
        return NextResponse.json(
            {
                error:
                    err.message ||
                    "Internal server error",
            },
            { status: 500 }
        );
    }
}