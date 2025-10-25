import { supabase } from "@/integrations/supabase/client";

/**
 * Enhanced Import Service with Import History Logging
 * Records all import operations to import_history table
 */

export interface ImportMetadata {
  examId: string;
  examTitle: string;
  examType?: string;
  examDate?: string;
  fileName: string;
  fileSize?: number;
  fileType?: string;
  mappingConfig?: any;
  importOptions?: any;
}

export interface ImportResult {
  success: boolean;
  historyId?: string;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  errors: any[];
  warnings: any[];
  processingTimeMs: number;
}

/**
 * Create import history record at start of import
 */
export async function createImportHistoryRecord(
  metadata: ImportMetadata
): Promise<string | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("import_history")
      .insert({
        imported_by: user?.id,
        exam_id: metadata.examId,
        exam_title: metadata.examTitle,
        exam_type: metadata.examType,
        exam_date: metadata.examDate,
        file_name: metadata.fileName,
        file_size: metadata.fileSize,
        file_type: metadata.fileType,
        mapping_config: metadata.mappingConfig,
        import_options: metadata.importOptions,
        import_status: "processing",
        total_records: 0,
        successful_records: 0,
        failed_records: 0,
      })
      .select("id")
      .single();

    if (error) throw error;
    return data?.id || null;
  } catch (error) {
    console.error("Failed to create import history record:", error);
    return null;
  }
}

/**
 * Update import history record with results
 */
export async function updateImportHistoryRecord(
  historyId: string,
  result: Partial<ImportResult>,
  status:
    | "pending"
    | "processing"
    | "completed"
    | "failed"
    | "partial" = "completed"
): Promise<void> {
  try {
    const updates: any = {
      import_status: status,
      updated_at: new Date().toISOString(),
    };

    if (result.totalRecords !== undefined)
      updates.total_records = result.totalRecords;
    if (result.successfulRecords !== undefined)
      updates.successful_records = result.successfulRecords;
    if (result.failedRecords !== undefined)
      updates.failed_records = result.failedRecords;
    if (result.errors) updates.error_log = result.errors;
    if (result.warnings) updates.warnings = result.warnings;
    if (result.processingTimeMs)
      updates.processing_time_ms = result.processingTimeMs;

    // Determine final status based on results
    if (result.totalRecords && result.successfulRecords) {
      if (result.failedRecords === 0) {
        updates.import_status = "completed";
      } else if (result.successfulRecords > 0) {
        updates.import_status = "partial";
      } else {
        updates.import_status = "failed";
      }
    }

    const { error } = await supabase
      .from("import_history")
      .update(updates)
      .eq("id", historyId);

    if (error) throw error;
  } catch (error) {
    console.error("Failed to update import history record:", error);
  }
}

/**
 * Record import error
 */
export async function recordImportError(
  historyId: string,
  error: any
): Promise<void> {
  try {
    const { error: updateError } = await supabase
      .from("import_history")
      .update({
        import_status: "failed",
        error_log: [
          {
            message: error.message || "Unknown error",
            timestamp: new Date().toISOString(),
            stack: error.stack,
          },
        ],
        updated_at: new Date().toISOString(),
      })
      .eq("id", historyId);

    if (updateError) throw updateError;
  } catch (err) {
    console.error("Failed to record import error:", err);
  }
}

/**
 * Get recent import history
 */
export async function getRecentImports(limit = 10): Promise<any[] | null> {
  try {
    const { data, error } = await supabase
      .from("import_history")
      .select("*")
      .order("import_date", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Failed to get recent imports:", error);
    return null;
  }
}

/**
 * Get import statistics
 */
export async function getImportStatistics(
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalImports: number;
  successfulImports: number;
  failedImports: number;
  partialImports: number;
  totalRecordsImported: number;
  averageProcessingTime: number;
} | null> {
  try {
    let query = supabase.from("import_history").select("*");

    if (startDate) {
      query = query.gte("import_date", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("import_date", endDate.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        totalImports: 0,
        successfulImports: 0,
        failedImports: 0,
        partialImports: 0,
        totalRecordsImported: 0,
        averageProcessingTime: 0,
      };
    }

    const stats = {
      totalImports: data.length,
      successfulImports: data.filter((r) => r.import_status === "completed")
        .length,
      failedImports: data.filter((r) => r.import_status === "failed").length,
      partialImports: data.filter((r) => r.import_status === "partial").length,
      totalRecordsImported: data.reduce(
        (sum, r) => sum + (r.successful_records || 0),
        0
      ),
      averageProcessingTime:
        data.reduce((sum, r) => sum + (r.processing_time_ms || 0), 0) /
        data.length,
    };

    return stats;
  } catch (error) {
    console.error("Failed to get import statistics:", error);
    return null;
  }
}

/**
 * Delete old import history records (cleanup)
 */
export async function cleanupOldImportHistory(
  daysToKeep = 90
): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const { data, error } = await supabase
      .from("import_history")
      .delete()
      .lt("import_date", cutoffDate.toISOString())
      .select("id");

    if (error) throw error;
    return data?.length || 0;
  } catch (error) {
    console.error("Failed to cleanup old import history:", error);
    return 0;
  }
}

/**
 * Search import history
 */
export async function searchImportHistory(filters: {
  examTitle?: string;
  examId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<any[] | null> {
  try {
    let query = supabase
      .from("import_history")
      .select("*")
      .order("import_date", { ascending: false });

    if (filters.examTitle) {
      query = query.ilike("exam_title", `%${filters.examTitle}%`);
    }
    if (filters.examId) {
      query = query.eq("exam_id", filters.examId);
    }
    if (filters.status) {
      query = query.eq("import_status", filters.status);
    }
    if (filters.startDate) {
      query = query.gte("import_date", filters.startDate.toISOString());
    }
    if (filters.endDate) {
      query = query.lte("import_date", filters.endDate.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Failed to search import history:", error);
    return null;
  }
}

/**
 * Add notes to import record
 */
export async function addImportNotes(
  historyId: string,
  notes: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("import_history")
      .update({ notes, updated_at: new Date().toISOString() })
      .eq("id", historyId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Failed to add import notes:", error);
    return false;
  }
}
