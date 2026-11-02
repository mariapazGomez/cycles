-- ExerciseLog y SessionFeedback son un registro histórico: nunca se editan ni
-- se borran (docs/SEGURIDAD.md, R7 y hallazgo S-12). Hasta ahora lo garantizaba
-- solo la aplicación; estos triggers lo garantizan también la base, para que un
-- error de código o un UPDATE/DELETE sin WHERE en la consola de Supabase no
-- pueda dañar el historial de los atletas.
--
-- Lo único que se permite sin más es pasar `active` de 1 a 0 (al reabrir una
-- sesión). Todo lo demás (cambiar otra columna, volver `active` a 1, borrar o
-- vaciar la tabla) da error, salvo dentro de una transacción que lo declare:
--
--   BEGIN;
--   SET LOCAL cycles.allow_purge = 'on';
--   ...la corrección excepcional...
--   COMMIT;
--
-- Lo usan el borrado de cuenta desde la app (derecho de supresión), el script
-- seed-demo y las pruebas. Es una protección contra errores, no contra quien
-- tenga la contraseña del dueño de las tablas (puede desactivar el trigger).
-- Aditiva: no cambia columnas ni datos. Ver docs/MIGRACIONES.md.

CREATE OR REPLACE FUNCTION cycles_registro_permite_excepcion() RETURNS boolean
LANGUAGE sql STABLE AS
$$ SELECT coalesce(current_setting('cycles.allow_purge', true), '') = 'on' $$;

CREATE OR REPLACE FUNCTION cycles_registro_antes_de_update() RETURNS trigger
LANGUAGE plpgsql AS
$$
BEGIN
  IF cycles_registro_permite_excepcion() THEN
    RETURN NEW;
  END IF;
  -- Sin cambios: no hay nada que proteger.
  IF NEW IS NOT DISTINCT FROM OLD THEN
    RETURN NEW;
  END IF;
  -- Única modificación permitida: anular la fila (active 1 -> 0).
  IF OLD."active" = 1 AND NEW."active" = 0 AND (to_jsonb(NEW) - 'active') = (to_jsonb(OLD) - 'active') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'La tabla "%" es un registro histórico: solo se puede anular una fila (active 1 a 0), no editarla.', TG_TABLE_NAME
    USING ERRCODE = 'integrity_constraint_violation',
          HINT = 'Una corrección es una fila nueva con supersedesId. Si de verdad hay que corregir datos, usa BEGIN; SET LOCAL cycles.allow_purge = ''on''; ...; COMMIT;';
END
$$;

CREATE OR REPLACE FUNCTION cycles_registro_antes_de_borrar() RETURNS trigger
LANGUAGE plpgsql AS
$$
BEGIN
  IF cycles_registro_permite_excepcion() THEN
    IF TG_LEVEL = 'ROW' THEN
      RETURN OLD;
    END IF;
    RETURN NULL;
  END IF;
  RAISE EXCEPTION 'La tabla "%" es un registro histórico: no se borra ni se vacía.', TG_TABLE_NAME
    USING ERRCODE = 'integrity_constraint_violation',
          HINT = 'Eliminar una cuenta se hace desde la app. Para una corrección excepcional usa BEGIN; SET LOCAL cycles.allow_purge = ''on''; ...; COMMIT;';
END
$$;

CREATE TRIGGER "ExerciseLog_solo_agrega_update" BEFORE UPDATE ON "ExerciseLog"
  FOR EACH ROW EXECUTE FUNCTION cycles_registro_antes_de_update();
CREATE TRIGGER "ExerciseLog_solo_agrega_delete" BEFORE DELETE ON "ExerciseLog"
  FOR EACH ROW EXECUTE FUNCTION cycles_registro_antes_de_borrar();
CREATE TRIGGER "ExerciseLog_solo_agrega_truncate" BEFORE TRUNCATE ON "ExerciseLog"
  FOR EACH STATEMENT EXECUTE FUNCTION cycles_registro_antes_de_borrar();

CREATE TRIGGER "SessionFeedback_solo_agrega_update" BEFORE UPDATE ON "SessionFeedback"
  FOR EACH ROW EXECUTE FUNCTION cycles_registro_antes_de_update();
CREATE TRIGGER "SessionFeedback_solo_agrega_delete" BEFORE DELETE ON "SessionFeedback"
  FOR EACH ROW EXECUTE FUNCTION cycles_registro_antes_de_borrar();
CREATE TRIGGER "SessionFeedback_solo_agrega_truncate" BEFORE TRUNCATE ON "SessionFeedback"
  FOR EACH STATEMENT EXECUTE FUNCTION cycles_registro_antes_de_borrar();
