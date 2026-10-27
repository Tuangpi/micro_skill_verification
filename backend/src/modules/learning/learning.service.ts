import type { PrismaClient } from '../../shared/database/prisma.js';
import type { AppLogger } from '../../shared/logger/logger.js';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../shared/errors/app-error.js';
import { updateProgressSchema } from './learning.schemas.js';

export type ProgressView = {
  id: string;
  studentId: string;
  lessonId: string;
  positionSeconds: number;
  completed: boolean;
  completedAt: string | null;
  updatedAt: string;
};

export type LessonOutline = {
  id: string;
  title: string;
  position: number;
  durationSeconds: number | null;
  isPreview: boolean;
};

export type SectionOutline = {
  id: string;
  title: string;
  position: number;
  lessons: LessonOutline[];
};

export type LessonDetailView = {
  lesson: {
    id: string;
    sectionId: string;
    title: string;
    description: string | null;
    position: number;
    videoProvider: string | null;
    videoRef: string | null;
    durationSeconds: number | null;
    isPreview: boolean;
  };
  course: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    priceMmk: number;
  };
  sections: SectionOutline[];
  progress: ProgressView | null;
  accessExpiresAt: string;
};

export type LearningService = {
  getLesson: (
    userId: string,
    role: string,
    lessonId: string,
  ) => Promise<LessonDetailView>;
  updateProgress: (
    userId: string,
    role: string,
    lessonId: string,
    input: unknown,
  ) => Promise<ProgressView>;
};

export function createLearningService(
  prisma: PrismaClient,
  _logger: AppLogger,
): LearningService {
  async function loadLessonWithCourse(lessonId: string) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        section: {
          include: {
            course: {
              include: {
                sections: {
                  orderBy: { position: 'asc' },
                  include: { lessons: { orderBy: { position: 'asc' } } },
                },
              },
            },
          },
        },
      },
    });
    if (!lesson) throw new NotFoundError('Lesson not found');
    return lesson;
  }

  async function assertAccess(userId: string, role: string, lessonId: string) {
    const lesson = await loadLessonWithCourse(lessonId);
    const course = lesson.section.course;
    if (role === 'ADMIN') return { lesson, course };
    if (role === 'TEACHER' && course.teacherId === userId) return { lesson, course };
    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: userId, courseId: course.id } },
    });
    if (!enrollment) throw new ForbiddenError('Enrollment required');
    return { lesson, course };
  }

  async function getLesson(userId: string, role: string, lessonId: string) {
    const { lesson, course } = await assertAccess(userId, role, lessonId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sections: SectionOutline[] = course.sections.map((s: any) => ({
      id: s.id,
      title: s.title,
      position: s.position,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lessons: s.lessons.map((l: any) => ({
        id: l.id,
        title: l.title,
        position: l.position,
        durationSeconds: l.durationSeconds,
        isPreview: l.isPreview,
      })),
    }));

    const progressRecord = await prisma.lessonProgress.findUnique({
      where: { studentId_lessonId: { studentId: userId, lessonId } },
    });

    const progress: ProgressView | null = progressRecord
      ? {
          id: progressRecord.id,
          studentId: progressRecord.studentId,
          lessonId: progressRecord.lessonId,
          positionSeconds: progressRecord.positionSeconds,
          completed: progressRecord.completed,
          completedAt: progressRecord.completedAt
            ? progressRecord.completedAt.toISOString()
            : null,
          updatedAt: progressRecord.updatedAt.toISOString(),
        }
      : null;

    const accessExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    return {
      lesson: {
        id: lesson.id,
        sectionId: lesson.sectionId,
        title: lesson.title,
        description: lesson.description,
        position: lesson.position,
        videoProvider: lesson.videoProvider,
        videoRef: lesson.videoRef,
        durationSeconds: lesson.durationSeconds,
        isPreview: lesson.isPreview,
      },
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        priceMmk: course.priceMmk,
      },
      sections,
      progress,
      accessExpiresAt,
    };
  }

  async function updateProgress(
    userId: string,
    role: string,
    lessonId: string,
    input: unknown,
  ) {
    await assertAccess(userId, role, lessonId);

    const parsed = updateProgressSchema.safeParse(input ?? {});
    if (!parsed.success)
      throw new ValidationError('Request validation failed', parsed.error.issues);
    const data = parsed.data;

    const existing = await prisma.lessonProgress.findUnique({
      where: { studentId_lessonId: { studentId: userId, lessonId } },
    });

    const completed = data.completed ?? existing?.completed ?? false;
    const positionSeconds = data.positionSeconds ?? existing?.positionSeconds ?? 0;

    const record = await prisma.lessonProgress.upsert({
      where: { studentId_lessonId: { studentId: userId, lessonId } },
      create: {
        studentId: userId,
        lessonId,
        positionSeconds,
        completed,
        completedAt: completed ? new Date() : null,
      },
      update: {
        positionSeconds,
        completed,
        completedAt: completed
          ? (existing?.completedAt ?? new Date())
          : (existing?.completedAt ?? null),
      },
    });

    return {
      id: record.id,
      studentId: record.studentId,
      lessonId: record.lessonId,
      positionSeconds: record.positionSeconds,
      completed: record.completed,
      completedAt: record.completedAt ? record.completedAt.toISOString() : null,
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  return { getLesson, updateProgress };
}
