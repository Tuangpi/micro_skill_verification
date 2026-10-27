import type { PrismaClient } from '../../shared/database/prisma.js';
import type { AppLogger } from '../../shared/logger/logger.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../shared/errors/app-error.js';
import {
  createQuizSchema,
  updateQuizSchema,
  createQuestionSchema,
  submitAttemptSchema,
} from './quiz.schemas.js';

export type QuizView = {
  id: string;
  courseId: string;
  title: string;
  passMarkPercent: number;
  maxAttempts: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type QuestionView = {
  id: string;
  quizId: string;
  prompt: string;
  options: string[];
  position: number;
  correctOption?: number;
};

export type AttemptView = {
  id: string;
  quizId: string;
  studentId: string;
  scorePercent: number;
  passed: boolean;
  createdAt: string;
  certificateNumber: string | null;
};

export type CertificateView = {
  number: string;
  studentName: string;
  courseTitle: string;
  issuedAt: string;
};

export type QuizService = {
  createQuiz: (
    userId: string,
    role: string,
    courseId: string,
    input: unknown,
  ) => Promise<QuizView>;
  updateQuiz: (
    userId: string,
    role: string,
    quizId: string,
    input: unknown,
  ) => Promise<QuizView>;
  addQuestion: (
    userId: string,
    role: string,
    quizId: string,
    input: unknown,
  ) => Promise<QuestionView>;
  getQuizForStudent: (
    userId: string,
    quizId: string,
  ) => Promise<{ quiz: QuizView; questions: Omit<QuestionView, 'correctOption'>[] }>;
  getQuizForTeacher: (
    userId: string,
    role: string,
    quizId: string,
  ) => Promise<{ quiz: QuizView; questions: QuestionView[] }>;
  submitAttempt: (userId: string, quizId: string, input: unknown) => Promise<AttemptView>;
  verifyCertificate: (number: string) => Promise<CertificateView>;
  listMyCertificates: (
    userId: string,
  ) => Promise<{ number: string; courseTitle: string; issuedAt: string }[]>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toQuizView(r: any): QuizView {
  return {
    id: r.id,
    courseId: r.courseId,
    title: r.title,
    passMarkPercent: r.passMarkPercent,
    maxAttempts: r.maxAttempts,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function generateCertificateNumber(): string {
  return `CERT-${Math.random().toString(36).slice(2, 10).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

export function createQuizService(prisma: PrismaClient, _logger: AppLogger): QuizService {
  async function assertCourseOwner(userId: string, role: string, courseId: string) {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundError('Course not found');
    if (role !== 'ADMIN' && course.teacherId !== userId)
      throw new ForbiddenError('You do not own this course');
    return course;
  }

  async function assertQuizOwner(userId: string, role: string, quizId: string) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { course: true },
    });
    if (!quiz) throw new NotFoundError('Quiz not found');
    if (role !== 'ADMIN' && quiz.course.teacherId !== userId)
      throw new ForbiddenError('You do not own this quiz');
    return quiz;
  }

  async function createQuiz(
    userId: string,
    role: string,
    courseId: string,
    input: unknown,
  ) {
    await assertCourseOwner(userId, role, courseId);
    const parsed = createQuizSchema.safeParse(input ?? {});
    if (!parsed.success)
      throw new ValidationError('Request validation failed', parsed.error.issues);
    const data = parsed.data;
    const quiz = await prisma.quiz.create({
      data: {
        courseId,
        title: data.title,
        passMarkPercent: data.passMarkPercent ?? 70,
        maxAttempts: data.maxAttempts === undefined ? 5 : data.maxAttempts,
        status: 'DRAFT',
      },
    });
    return toQuizView(quiz);
  }

  async function updateQuiz(
    userId: string,
    role: string,
    quizId: string,
    input: unknown,
  ) {
    await assertQuizOwner(userId, role, quizId);
    const parsed = updateQuizSchema.safeParse(input ?? {});
    if (!parsed.success)
      throw new ValidationError('Request validation failed', parsed.error.issues);
    const data = parsed.data;
    const quiz = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.passMarkPercent !== undefined
          ? { passMarkPercent: data.passMarkPercent }
          : {}),
        ...(data.maxAttempts !== undefined ? { maxAttempts: data.maxAttempts } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });
    return toQuizView(quiz);
  }

  async function addQuestion(
    userId: string,
    role: string,
    quizId: string,
    input: unknown,
  ) {
    await assertQuizOwner(userId, role, quizId);
    const parsed = createQuestionSchema.safeParse(input ?? {});
    if (!parsed.success)
      throw new ValidationError('Request validation failed', parsed.error.issues);
    const data = parsed.data;
    if (data.correctOption >= data.options.length)
      throw new ValidationError('correctOption out of range');
    const question = await prisma.quizQuestion.create({
      data: {
        quizId,
        prompt: data.prompt,
        options: data.options,
        correctOption: data.correctOption,
        position: data.position ?? 0,
      },
    });
    return {
      id: question.id,
      quizId: question.quizId,
      prompt: question.prompt,
      options: question.options,
      position: question.position,
      correctOption: question.correctOption,
    };
  }

  async function getQuizForTeacher(userId: string, role: string, quizId: string) {
    const quiz = await assertQuizOwner(userId, role, quizId);
    const questions = await prisma.quizQuestion.findMany({
      where: { quizId },
      orderBy: { position: 'asc' },
    });
    return {
      quiz: toQuizView(quiz),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      questions: questions.map((q: any) => ({
        id: q.id,
        quizId: q.quizId,
        prompt: q.prompt,
        options: q.options,
        position: q.position,
        correctOption: q.correctOption,
      })),
    };
  }

  async function getQuizForStudent(userId: string, quizId: string) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { course: true },
    });
    if (!quiz) throw new NotFoundError('Quiz not found');
    if (quiz.status !== 'PUBLISHED') throw new NotFoundError('Quiz not found');
    // enrollment check
    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: userId, courseId: quiz.courseId } },
    });
    if (!enrollment) throw new ForbiddenError('Enrollment required');
    const questions = await prisma.quizQuestion.findMany({
      where: { quizId },
      orderBy: { position: 'asc' },
    });
    return {
      quiz: toQuizView(quiz),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      questions: questions.map((q: any) => ({
        id: q.id,
        quizId: q.quizId,
        prompt: q.prompt,
        options: q.options,
        position: q.position,
      })),
    };
  }

  async function submitAttempt(userId: string, quizId: string, input: unknown) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { course: true, questions: true },
    });
    if (!quiz) throw new NotFoundError('Quiz not found');
    if (quiz.status !== 'PUBLISHED') throw new NotFoundError('Quiz not found');
    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: userId, courseId: quiz.courseId } },
    });
    if (!enrollment) throw new ForbiddenError('Enrollment required');

    const parsed = submitAttemptSchema.safeParse(input ?? {});
    if (!parsed.success)
      throw new ValidationError('Request validation failed', parsed.error.issues);
    const data = parsed.data;

    const attemptsCount = await prisma.quizAttempt.count({
      where: { quizId, studentId: userId },
    });
    if (quiz.maxAttempts !== null && attemptsCount >= quiz.maxAttempts)
      throw new ConflictError('Maximum attempts reached');

    const questions = quiz.questions;
    let correct = 0;
    for (const q of questions) {
      const submitted = data.answers[q.id];
      if (submitted === q.correctOption) correct++;
    }
    const scorePercent =
      questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    const passed = scorePercent >= quiz.passMarkPercent;

    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        studentId: userId,
        answers: data.answers,
        scorePercent,
        passed,
      },
    });

    // certificate issuance if eligible
    let certificateNumber: string | null = null;
    if (passed) {
      const allLessons = await prisma.lesson.findMany({
        where: { section: { courseId: quiz.courseId } },
      });
      const completedCount = await prisma.lessonProgress.count({
        where: {
          studentId: userId,
          completed: true,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          lessonId: { in: allLessons.map((l: any) => l.id) },
        },
      });
      const allCompleted = allLessons.length > 0 && completedCount === allLessons.length;
      if (allCompleted) {
        const existing = await prisma.certificate.findUnique({
          where: { studentId_courseId: { studentId: userId, courseId: quiz.courseId } },
        });
        if (!existing) {
          let number = generateCertificateNumber();
          // ensure uniqueness
          while (await prisma.certificate.findUnique({ where: { number } })) {
            number = generateCertificateNumber();
          }
          const cert = await prisma.certificate.create({
            data: {
              number,
              studentId: userId,
              courseId: quiz.courseId,
              quizId: quiz.id,
            },
          });
          certificateNumber = cert.number;
        } else {
          certificateNumber = existing.number;
        }
      }
    }

    return {
      id: attempt.id,
      quizId: attempt.quizId,
      studentId: attempt.studentId,
      scorePercent: attempt.scorePercent,
      passed: attempt.passed,
      createdAt: attempt.createdAt.toISOString(),
      certificateNumber,
    };
  }

  async function verifyCertificate(number: string) {
    const cert = await prisma.certificate.findUnique({
      where: { number },
      include: { student: true, course: true },
    });
    if (!cert) throw new NotFoundError('Certificate not found');
    return {
      number: cert.number,
      studentName: cert.student.name,
      courseTitle: cert.course.title,
      issuedAt: cert.issuedAt.toISOString(),
    };
  }

  async function listMyCertificates(userId: string) {
    const list = await prisma.certificate.findMany({
      where: { studentId: userId },
      include: { course: true },
      orderBy: { issuedAt: 'desc' },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return list.map((c: any) => ({
      number: c.number,
      courseTitle: c.course.title,
      issuedAt: c.issuedAt.toISOString(),
    }));
  }

  return {
    createQuiz,
    updateQuiz,
    addQuestion,
    getQuizForTeacher,
    getQuizForStudent,
    submitAttempt,
    verifyCertificate,
    listMyCertificates,
  };
}
