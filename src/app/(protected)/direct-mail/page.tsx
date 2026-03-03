"use client";

import { useState } from "react";

import { usePermission } from "@/components/gate";
import { RouteGuard } from "@/components/route-guard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddressVerification } from "@/features/direct-mail/components/address-verification";
import { DirectMailAnalyticsTab } from "@/features/direct-mail/components/analytics-tab";
import { CreatePieceDialog } from "@/features/direct-mail/components/create-piece-dialog";
import { PieceList } from "@/features/direct-mail/components/piece-list";

export default function DirectMailPage() {
  const canManage = usePermission("direct-mail.manage");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  return (
    <RouteGuard permission="direct-mail.view">
      <div className="p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Direct Mail</h1>
            <p className="mt-1 text-zinc-400">
              Manage postcards, letters, self-mailers, and checks
            </p>
          </div>
          {canManage && (
            <Button onClick={() => setShowCreateDialog(true)}>+ Create Piece</Button>
          )}
        </div>

        <Tabs defaultValue="analytics" className="mt-6">
          <TabsList>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="postcards">Postcards</TabsTrigger>
            <TabsTrigger value="letters">Letters</TabsTrigger>
            <TabsTrigger value="self-mailers">Self-Mailers</TabsTrigger>
            <TabsTrigger value="checks">Checks</TabsTrigger>
            <TabsTrigger value="verify">Verify Address</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <DirectMailAnalyticsTab />
          </TabsContent>
          <TabsContent value="postcards">
            <PieceList pieceType="postcards" />
          </TabsContent>
          <TabsContent value="letters">
            <PieceList pieceType="letters" />
          </TabsContent>
          <TabsContent value="self-mailers">
            <PieceList pieceType="self-mailers" />
          </TabsContent>
          <TabsContent value="checks">
            <PieceList pieceType="checks" />
          </TabsContent>
          <TabsContent value="verify">
            <AddressVerification />
          </TabsContent>
        </Tabs>
      </div>

      <CreatePieceDialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} />
    </RouteGuard>
  );
}
