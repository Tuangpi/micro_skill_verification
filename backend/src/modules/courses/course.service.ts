import type { PrismaClient } from '../../shared/database/prisma.js';
import type { AppLogger } from '../../shared/logger/logger.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../shared/errors/app-error.js';
import {
  createCourseSchema,
  updateCourseSchema,
  createSectionSchema,
  updateSectionSchema,
  createLessonSchema,
  updateLessonSchema,
  reorderSchema,
} from './course.schemas.js';
import type { FileStorage } from '../../shared/storage/file-storage.js';

export type CourseStatus = 'DRAFT' | 'SUBMITTED' | 'PUBLISHED' | 'ARCHIVED';

export type CourseView = {
  id: string;
  teacherId: string;
  title: string;
  slug: string;
  description: string | null;
  priceMmk: number;
  status: CourseStatus;
  coverMediaId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SectionView = {
  id: string;
  courseId: string;
  title: string;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export type LessonView = {
  id: string;
  sectionId: string;
  title: string;
  description: string | null;
  position: number;
  videoProvider: string | null;
  videoRef: string | null;
  durationSeconds: number | null;
  isPreview: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MediaAssetView = {
  id: string;
  ownerId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  kind: string;
  createdAt: string;
};

export type CourseService = {
  isApprovedTeacher: (userId: string) => Promise<boolean>;
  createCourse: (userId: string, input: unknown) => Promise<CourseView>;
  listMyCourses: (userId: string) => Promise<CourseView[]>;
  getCourse: (userId: string, role: string, id: string) => Promise<CourseView>;
  updateCourse: (
    userId: string,
    role: string,
    id: string,
    input: unknown,
  ) => Promise<CourseView>;
  deleteCourse: (userId: string, role: string, id: string) => Promise<void>;
  createSection: (
    userId: string,
    role: string,
    courseId: string,
    input: unknown,
  ) => Promise<SectionView>;
  updateSection: (
    userId: string,
    role: string,
    sectionId: string,
    input: unknown,
  ) => Promise<SectionView>;
  deleteSection: (userId: string, role: string, sectionId: string) => Promise<void>;
  reorderSections: (
    userId: string,
    role: string,
    courseId: string,
    input: unknown,
  ) => Promise<void>;
  createLesson: (
    userId: string,
    role: string,
    sectionId: string,
    input: unknown,
  ) => Promise<LessonView>;
  updateLesson: (
    userId: string,
    role: string,
    lessonId: string,
    input: unknown,
  ) => Promise<LessonView>;
  deleteLesson: (userId: string, role: string, lessonId: string) => Promise<void>;
  reorderLessons: (
    userId: string,
    role: string,
    sectionId: string,
    input: unknown,
  ) => Promise<void>;
  createMediaAsset: (
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) => Promise<MediaAssetView>;
  getMediaAsset: (
    userId: string,
    role: string,
    id: string,
  ) => Promise<{ asset: MediaAssetView; storageKey: string }>;
  deleteMediaAsset: (userId: string, role: string, id: string) => Promise<void>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCourseView(r: any): CourseView {
  return {
    id: r.id,
    teacherId: r.teacherId,
    title: r.title,
    slug: r.slug,
    description: r.description,
    priceMmk: r.priceMmk,
    status: r.status as CourseStatus,
    coverMediaId: r.coverMediaId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSectionView(r: any): SectionView {
  return {
    id: r.id,
    courseId: r.courseId,
    title: r.title,
    position: r.position,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toLessonView(r: any): LessonView {
  return {
    id: r.id,
    sectionId: r.sectionId,
    title: r.title,
    description: r.description,
    position: r.position,
    videoProvider: r.videoProvider,
    videoRef: r.videoRef,
    durationSeconds: r.durationSeconds,
    isPreview: r.isPreview,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toMediaView(r: any): MediaAssetView {
  return {
    id: r.id,
    ownerId: r.ownerId,
    originalName: r.originalName,
    mimeType: r.mimeType,
    sizeBytes: r.sizeBytes,
    kind: r.kind,
    createdAt: r.createdAt.toISOString(),
  };
}

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 200) || 'course'
  );
}

export function createCourseService(
  prisma: PrismaClient,
  _logger: AppLogger,
  storage: FileStorage,
): CourseService {
  async function isApprovedTeacher(userId: string): Promise<boolean> {
    const profile = await prisma.teacherProfile.findUnique({ where: { userId } });
    return profile?.status === 'APPROVED';
  }

  async function requireApprovedTeacher(userId: string): Promise<void> {
    if (!(await isApprovedTeacher(userId))) {
      throw new ForbiddenError('Approved teacher account required');
    }
  }

  async function loadCourse(id: string) {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundError('Course not found');
    return course;
  }

  function assertOwnerOrAdmin(
    course: { teacherId: string },
    userId: string,
    role: string,
  ): void {
    if (role === 'ADMIN') return;
    if (course.teacherId !== userId)
      throw new ForbiddenError('You do not own this course');
  }

  async function createCourse(userId: string, input: unknown): Promise<CourseView> {
    await requireApprovedTeacher(userId);
    const parsed = createCourseSchema.safeParse(input ?? {});
    if (!parsed.success)
      throw new ValidationError('Request validation failed', parsed.error.issues);
    const data = parsed.data;

    let slug = data.slug ?? slugify(data.title);
    const existing = await prisma.course.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const course = await prisma.course.create({
      data: {
        teacherId: userId,
        title: data.title,
        slug,
        description: data.description ?? null,
        priceMmk: data.priceMmk,
        status: 'DRAFT',
      },
    });
    return toCourseView(course);
  }

  async function listMyCourses(userId: string): Promise<CourseView[]> {
    const courses = await prisma.course.findMany({
      where: { teacherId: userId },
      orderBy: { createdAt: 'desc' },
    });
    return courses.map(toCourseView);
  }

  async function getCourse(
    userId: string,
    role: string,
    id: string,
  ): Promise<CourseView> {
    const course = await loadCourse(id);
    assertOwnerOrAdmin(course, userId, role);
    return toCourseView(course);
  }

  async function updateCourse(
    userId: string,
    role: string,
    id: string,
    input: unknown,
  ): Promise<CourseView> {
    const course = await loadCourse(id);
    assertOwnerOrAdmin(course, userId, role);
    if (course.status !== 'DRAFT' && role !== 'ADMIN') {
      throw new ConflictError('Only draft courses can be edited');
    }
    const parsed = updateCourseSchema.safeParse(input ?? {});
    if (!parsed.success)
      throw new ValidationError('Request validation failed', parsed.error.issues);
    const data = parsed.data;

    if (data.slug) {
      const clash = await prisma.course.findUnique({ where: { slug: data.slug } });
      if (clash && clash.id !== id) throw new ConflictError('Slug already in use');
    }

    const updated = await prisma.course.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.priceMmk !== undefined ? { priceMmk: data.priceMmk } : {}),
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.coverMediaId !== undefined ? { coverMediaId: data.coverMediaId } : {}),
      },
    });
    return toCourseView(updated);
  }

  async function deleteCourse(userId: string, role: string, id: string): Promise<void> {
    const course = await loadCourse(id);
    assertOwnerOrAdmin(course, userId, role);
    if (course.status !== 'DRAFT' && role !== 'ADMIN') {
      throw new ConflictError('Only draft courses can be deleted');
    }
    await prisma.course.delete({ where: { id } });
  }

  async function ensureSectionOwnership(userId: string, role: string, sectionId: string) {
    const section = await prisma.courseSection.findUnique({
      where: { id: sectionId },
      include: { course: true },
    });
    if (!section) throw new NotFoundError('Section not found');
    assertOwnerOrAdmin(section.course, userId, role);
    return section;
  }

  async function createSection(
    userId: string,
    role: string,
    courseId: string,
    input: unknown,
  ): Promise<SectionView> {
    const course = await loadCourse(courseId);
    assertOwnerOrAdmin(course, userId, role);
    const parsed = createSectionSchema.safeParse(input ?? {});
    if (!parsed.success)
      throw new ValidationError('Request validation failed', parsed.error.issues);
    const data = parsed.data;
    let position = data.position;
    if (position === undefined) {
      const last = await prisma.courseSection.findFirst({
        where: { courseId },
        orderBy: { position: 'desc' },
      });
      position = last ? last.position + 1 : 0;
    }
    const section = await prisma.courseSection.create({
      data: { courseId, title: data.title, position: position as number },
    });
    return toSectionView(section);
  }

  async function updateSection(
    userId: string,
    role: string,
    sectionId: string,
    input: unknown,
  ): Promise<SectionView> {
    await ensureSectionOwnership(userId, role, sectionId);
    const parsed = updateSectionSchema.safeParse(input ?? {});
    if (!parsed.success)
      throw new ValidationError('Request validation failed', parsed.error.issues);
    const data = parsed.data;
    const updated = await prisma.courseSection.update({
      where: { id: sectionId },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.position !== undefined ? { position: data.position } : {}),
      },
    });
    return toSectionView(updated);
  }

  async function deleteSection(
    userId: string,
    role: string,
    sectionId: string,
  ): Promise<void> {
    await ensureSectionOwnership(userId, role, sectionId);
    await prisma.courseSection.delete({ where: { id: sectionId } });
  }

  async function reorderSections(
    userId: string,
    role: string,
    courseId: string,
    input: unknown,
  ): Promise<void> {
    const course = await loadCourse(courseId);
    assertOwnerOrAdmin(course, userId, role);
    const parsed = reorderSchema.safeParse(input ?? {});
    if (!parsed.success)
      throw new ValidationError('Request validation failed', parsed.error.issues);
    const ids = parsed.data.orderedIds;
    const sections = await prisma.courseSection.findMany({ where: { courseId } });
    const set = new Set(sections.map((s) => s.id));
    if (ids.some((id) => !set.has(id)) || ids.length !== sections.length) {
      throw new ValidationError(
        'orderedIds must include all sections of the course exactly once',
      );
    }
    await prisma.$transaction(
      ids.map((id, idx) =>
        prisma.courseSection.update({ where: { id }, data: { position: idx } }),
      ),
    );
  }

  async function ensureLessonOwnership(userId: string, role: string, lessonId: string) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { section: { include: { course: true } } },
    });
    if (!lesson) throw new NotFoundError('Lesson not found');
    assertOwnerOrAdmin(lesson.section.course, userId, role);
    return lesson;
  }

  async function createLesson(
    userId: string,
    role: string,
    sectionId: string,
    input: unknown,
  ): Promise<LessonView> {
    const section = await prisma.courseSection.findUnique({
      where: { id: sectionId },
      include: { course: true },
    });
    if (!section) throw new NotFoundError('Section not found');
    assertOwnerOrAdmin(section.course, userId, role);
    const parsed = createLessonSchema.safeParse(input ?? {});
    if (!parsed.success)
      throw new ValidationError('Request validation failed', parsed.error.issues);
    const data = parsed.data;
    let position = data.position;
    if (position === undefined) {
      const last = await prisma.lesson.findFirst({
        where: { sectionId },
        orderBy: { position: 'desc' },
      });
      position = last ? last.position + 1 : 0;
    }
    const lesson = await prisma.lesson.create({
      data: {
        sectionId,
        title: data.title,
        description: data.description ?? null,
        position: position as number,
        videoProvider: data.videoProvider ?? null,
        videoRef: data.videoRef ?? null,
        durationSeconds: data.durationSeconds ?? null,
        isPreview: data.isPreview ?? false,
      },
    });
    return toLessonView(lesson);
  }

  async function updateLesson(
    userId: string,
    role: string,
    lessonId: string,
    input: unknown,
  ): Promise<LessonView> {
    await ensureLessonOwnership(userId, role, lessonId);
    const parsed = updateLessonSchema.safeParse(input ?? {});
    if (!parsed.success)
      throw new ValidationError('Request validation failed', parsed.error.issues);
    const data = parsed.data;
    const updated = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.position !== undefined ? { position: data.position } : {}),
        ...(data.videoProvider !== undefined
          ? { videoProvider: data.videoProvider }
          : {}),
        ...(data.videoRef !== undefined ? { videoRef: data.videoRef } : {}),
        ...(data.durationSeconds !== undefined
          ? { durationSeconds: data.durationSeconds }
          : {}),
        ...(data.isPreview !== undefined ? { isPreview: data.isPreview } : {}),
      },
    });
    return toLessonView(updated);
  }

  async function deleteLesson(
    userId: string,
    role: string,
    lessonId: string,
  ): Promise<void> {
    await ensureLessonOwnership(userId, role, lessonId);
    await prisma.lesson.delete({ where: { id: lessonId } });
  }

  async function reorderLessons(
    userId: string,
    role: string,
    sectionId: string,
    input: unknown,
  ): Promise<void> {
    const section = await prisma.courseSection.findUnique({
      where: { id: sectionId },
      include: { course: true },
    });
    if (!section) throw new NotFoundError('Section not found');
    assertOwnerOrAdmin(section.course, userId, role);
    const parsed = reorderSchema.safeParse(input ?? {});
    if (!parsed.success)
      throw new ValidationError('Request validation failed', parsed.error.issues);
    const ids = parsed.data.orderedIds;
    const lessons = await prisma.lesson.findMany({ where: { sectionId } });
    const set = new Set(lessons.map((l) => l.id));
    if (ids.some((id) => !set.has(id)) || ids.length !== lessons.length) {
      throw new ValidationError(
        'orderedIds must include all lessons of the section exactly once',
      );
    }
    await prisma.$transaction(
      ids.map((id, idx) =>
        prisma.lesson.update({ where: { id }, data: { position: idx } }),
      ),
    );
  }

  function classifyMime(mime: string): string {
    if (mime.startsWith('image/')) return 'IMAGE';
    if (mime === 'application/pdf') return 'DOCUMENT';
    return 'OTHER';
  }

  async function createMediaAsset(
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ): Promise<MediaAssetView> {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new ValidationError('Unsupported file type', { mimetype: file.mimetype });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new ValidationError('File too large', { maxBytes: MAX_UPLOAD_BYTES });
    }
    const stored = await storage.save(file.buffer, {
      mimeType: file.mimetype,
      originalName: file.originalname,
    });
    const asset = await prisma.mediaAsset.create({
      data: {
        ownerId: userId,
        storageKey: stored.storageKey,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        kind: classifyMime(file.mimetype) as 'IMAGE' | 'DOCUMENT' | 'OTHER',
      },
    });
    return toMediaView(asset);
  }

  async function getMediaAsset(
    userId: string,
    role: string,
    id: string,
  ): Promise<{ asset: MediaAssetView; storageKey: string }> {
    const asset = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundError('Media asset not found');
    if (role !== 'ADMIN' && asset.ownerId !== userId) {
      throw new ForbiddenError('You do not have access to this file');
    }
    return { asset: toMediaView(asset), storageKey: asset.storageKey };
  }

  async function deleteMediaAsset(
    userId: string,
    role: string,
    id: string,
  ): Promise<void> {
    const asset = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundError('Media asset not found');
    if (role !== 'ADMIN' && asset.ownerId !== userId) {
      throw new ForbiddenError('You do not have access to this file');
    }
    await storage.remove(asset.storageKey);
    await prisma.mediaAsset.delete({ where: { id } });
  }

  return {
    isApprovedTeacher,
    createCourse,
    listMyCourses,
    getCourse,
    updateCourse,
    deleteCourse,
    createSection,
    updateSection,
    deleteSection,
    reorderSections,
    createLesson,
    updateLesson,
    deleteLesson,
    reorderLessons,
    createMediaAsset,
    getMediaAsset,
    deleteMediaAsset,
  };
}
